// Cómo se dibuja el widget: monedas que se llenan de líquido de color, igual que en la app.
import SwiftUI
import WidgetKit
import AppIntents
import UIKit

// MARK: Colores

extension Color {
    /// Color a partir de "#RRGGBB". "brillo" menor que 1 lo oscurece.
    init(hex: String, brillo: Double = 1) {
        var s = hex.trimmingCharacters(in: .whitespacesAndNewlines)
        if s.hasPrefix("#") { s.removeFirst() }
        var n: UInt64 = 0
        guard s.count == 6, Scanner(string: s).scanHexInt64(&n) else {
            self = Color(red: 0.56, green: 0.56, blue: 0.58)
            return
        }
        self = Color(red: Double((n >> 16) & 0xff) / 255 * brillo,
                     green: Double((n >> 8) & 0xff) / 255 * brillo,
                     blue: Double(n & 0xff) / 255 * brillo)
    }
}

enum Paleta {
    static func fondo(_ e: ColorScheme) -> Color { e == .dark ? Color(hex: "#151517") : .white }
    static func vacio(_ e: ColorScheme) -> Color { e == .dark ? .black : Color(hex: "#E1E4EA") }
    static func hundido(_ e: ColorScheme) -> Color { e == .dark ? Color(hex: "#2A2A2E") : Color(hex: "#E6E8EE") }
    static func aro(_ e: ColorScheme) -> Color { e == .dark ? Color.white.opacity(0.10) : Color.black.opacity(0.06) }
    static func tinta(_ e: ColorScheme) -> Color { e == .dark ? Color(hex: "#F4F4F6") : Color(hex: "#10131A") }
    static func suave(_ e: ColorScheme) -> Color { e == .dark ? Color(hex: "#A0A0AA") : Color(hex: "#687082") }
    static func oro(_ e: ColorScheme) -> Color { e == .dark ? Color(hex: "#FFCD1F") : Color(hex: "#E0A800") }
    static let alerta = "#FF5247"
}

// MARK: Datos que necesita el dibujo

struct DatosWidget {
    var habitos: [Habito]
    var cuentas: [String: Int]
    var hayToques: Bool
    var compartida = true

    init(habitos: [Habito], cuentas: [String: Int], hayToques: Bool) {
        self.habitos = habitos; self.cuentas = cuentas; self.hayToques = hayToques
    }
    init(estado: Estado) {
        habitos = estado.config.habitos
        cuentas = estado.hoy?.cuentas ?? [:]
        hayToques = !(estado.hoy?.toques.isEmpty ?? true)
        compartida = Almacen.hayCarpetaCompartida
    }

    private var fotos: [Foto] { Motor.foto(Config(habitos: habitos, horaReinicio: 0), cuentas) }
    var puntaje: Int? { Motor.puntaje(fotos) }
    var redondo: Bool { Motor.redondo(fotos) }

    /// Lo que se ve en la galería de widgets antes de agregarlo.
    static let ejemplo = DatosWidget(
        habitos: [
            Habito(id: "agua", emoji: "💧", nombre: "Agua", pasos: 8, color: "#2F9BFF"),
            Habito(id: "dientes", emoji: "🪥", nombre: "Dientes", pasos: 3, color: "#2ED3A0"),
            Habito(id: "bano", emoji: "🚿", nombre: "Baño", pasos: 1, color: "#1FC8D4"),
            Habito(id: "cama", emoji: "🛏️", nombre: "Tender la cama", pasos: 1, color: "#5E7BFF"),
            Habito(id: "perro", emoji: "🐶", nombre: "Perro", pasos: 3, color: "#FF9431"),
            Habito(id: "desayuno", emoji: "🍳", nombre: "Desayuno", pasos: 1, color: "#F7C21B"),
            Habito(id: "caminar", emoji: "👟", nombre: "Caminar o correr", pasos: 1, color: "#FF9431"),
            Habito(id: "proteina", emoji: "🥩", nombre: "Proteína", pasos: 3, color: "#FF6257"),
            Habito(id: "leer", emoji: "📖", nombre: "Leer", pasos: 1, color: "#A66BFF")
        ],
        cuentas: ["agua": 5, "dientes": 1, "bano": 1, "cama": 1, "perro": 2, "proteina": 1],
        hayToques: true)
}

// MARK: La moneda

/// El líquido: un nivel con la superficie ondulada. Sube con animación.
struct Liquido: Shape {
    var nivel: CGFloat

    var animatableData: CGFloat {
        get { nivel }
        set { nivel = newValue }
    }

    func path(in r: CGRect) -> Path {
        var p = Path()
        let n = min(max(nivel, 0), 1)
        guard n > 0 else { return p }
        let y = r.maxY - r.height * n
        let ola = n >= 1 ? 0 : r.height * 0.026
        p.move(to: CGPoint(x: r.minX, y: r.maxY))
        let pasos = 28
        for i in 0...pasos {
            let t = CGFloat(i) / CGFloat(pasos)
            p.addLine(to: CGPoint(x: r.minX + r.width * t, y: y - ola * sin(t * .pi * 4)))
        }
        p.addLine(to: CGPoint(x: r.maxX, y: r.maxY))
        p.closeSubpath()
        return p
    }
}

/// El emoji del teléfono. Con la pantalla de inicio teñida, iOS pinta todo de un solo color;
/// para que el emoji conserve los suyos se dibuja como imagen.
struct EmojiView: View {
    let emoji: String
    let lado: CGFloat
    @Environment(\.widgetRenderingMode) private var modo

    var body: some View {
        if #available(iOS 18.0, *), modo == .accented {
            Image(uiImage: Self.imagen(emoji, lado * 1.25))
                .resizable()
                .widgetAccentedRenderingMode(.fullColor)
                .frame(width: lado * 1.25, height: lado * 1.25)
        } else {
            Text(emoji)
                .font(.system(size: lado))
                .shadow(color: .black.opacity(0.22), radius: 1, y: 1)
        }
    }

    static func imagen(_ emoji: String, _ lado: CGFloat) -> UIImage {
        UIGraphicsImageRenderer(size: CGSize(width: lado, height: lado)).image { _ in
            let atributos: [NSAttributedString.Key: Any] = [.font: UIFont.systemFont(ofSize: lado * 0.8)]
            let texto = emoji as NSString
            let t = texto.size(withAttributes: atributos)
            texto.draw(at: CGPoint(x: (lado - t.width) / 2, y: (lado - t.height) / 2), withAttributes: atributos)
        }
    }
}

struct MonedaView: View {
    let habito: Habito
    let cuenta: Int
    let lado: CGFloat
    @Environment(\.colorScheme) private var esquema
    @Environment(\.widgetRenderingMode) private var modo

    var body: some View {
        let v = CGFloat(Motor.valor(tipo: habito.tipo, pasos: habito.pasos, c: cuenta))
        let pasada = Motor.excedido(tipo: habito.tipo, pasos: habito.pasos, c: cuenta)
        let hex = pasada ? Paleta.alerta : habito.color
        let aColor = modo == .fullColor

        ZStack {
            Circle().fill(aColor ? Paleta.vacio(esquema) : Color.primary.opacity(0.14))
            Liquido(nivel: v)
                .fill(LinearGradient(colors: [Color(hex: hex), Color(hex: hex, brillo: aColor ? 0.8 : 1)], startPoint: .top, endPoint: .bottom))
                .widgetAccentable()
                .animation(.spring(response: 0.55, dampingFraction: 0.66), value: v)
            if aColor {
                Circle().fill(RadialGradient(colors: [Color.white.opacity(esquema == .dark ? 0.10 : 0.28), .clear],
                                             center: UnitPoint(x: 0.28, y: 0.12), startRadius: 0, endRadius: lado * 0.55))
            }
            EmojiView(emoji: habito.emoji, lado: lado * 0.45)
        }
        .frame(width: lado, height: lado)
        .clipShape(Circle())
        .overlay(Circle().strokeBorder(Paleta.aro(esquema), lineWidth: 1))
        .overlay(alignment: .topTrailing) {
            if pasada {
                Text("\(cuenta)")
                    .font(.system(size: lado * 0.17, weight: .heavy, design: .rounded))
                    .monospacedDigit()
                    .foregroundStyle(Paleta.fondo(esquema))
                    .padding(.horizontal, lado * 0.06)
                    .frame(minWidth: lado * 0.3, minHeight: lado * 0.3)
                    .background(Capsule().fill(Paleta.tinta(esquema)))
            }
        }
        .shadow(color: v >= 1 && aColor ? Color(hex: hex).opacity(0.45) : .clear, radius: lado * 0.08, y: lado * 0.04)
        .accessibilityElement()
        .accessibilityLabel(Text(etiqueta(pasada)))
    }

    private func etiqueta(_ pasada: Bool) -> String {
        if habito.esLimite {
            return pasada ? "\(habito.nombre): llevas \(cuenta), límite \(habito.pasos)" : "\(habito.nombre): \(cuenta) de \(habito.pasos) máximo"
        }
        return "\(habito.nombre): \(cuenta) de \(habito.pasos)"
    }
}

// MARK: El tablero

/// Elige cuántas columnas dejan las monedas más grandes en el espacio que hay.
struct Rejilla {
    let columnas: Int
    let filas: Int
    let lado: CGFloat

    static func mejor(n: Int, ancho: CGFloat, alto: CGFloat, hueco: CGFloat) -> Rejilla {
        var mejor = Rejilla(columnas: 1, filas: max(n, 1), lado: 0)
        guard n > 0 else { return mejor }
        for columnas in 1...min(n, 6) {
            let filas = Int((Double(n) / Double(columnas)).rounded(.up))
            let lado = min((ancho - hueco * CGFloat(columnas - 1)) / CGFloat(columnas),
                           (alto - hueco * CGFloat(filas - 1)) / CGFloat(filas))
            if lado > mejor.lado + 0.5 { mejor = Rejilla(columnas: columnas, filas: filas, lado: lado) }
        }
        return mejor
    }
}

struct CabezaView: View {
    let datos: DatosWidget
    @Environment(\.colorScheme) private var esquema

    var body: some View {
        HStack(spacing: 7) {
            Text(datos.redondo ? "Día redondo" : "Hoy")
                .font(.system(size: 17, weight: .heavy, design: .rounded))
                .foregroundStyle(datos.redondo ? Paleta.oro(esquema) : Paleta.tinta(esquema))
                .widgetAccentable(datos.redondo)
            if let p = datos.puntaje, !datos.redondo {
                Text("\(p)%")
                    .font(.system(size: 15, weight: .bold, design: .rounded))
                    .monospacedDigit()
                    .foregroundStyle(Paleta.suave(esquema))
            }
            Spacer(minLength: 0)
            if datos.hayToques {
                Button(intent: DeshacerIntent()) {
                    Image(systemName: "arrow.uturn.backward")
                        .font(.system(size: 12, weight: .bold))
                        .foregroundStyle(Paleta.tinta(esquema))
                        .frame(width: 42, height: 24)
                        .background(Capsule().fill(Paleta.hundido(esquema).opacity(0.9)))
                }
                .buttonStyle(.plain)
                .accessibilityLabel(Text("Deshacer el último toque"))
            }
        }
    }
}

struct TableroView: View {
    let datos: DatosWidget
    let familia: WidgetFamily
    @Environment(\.colorScheme) private var esquema

    private var maximo: Int {
        switch familia {
        case .systemSmall: return 4
        case .systemMedium: return 10
        default: return 20
        }
    }

    var body: some View {
        let visibles = Array(datos.habitos.prefix(maximo))
        if visibles.isEmpty {
            VStack(spacing: 6) {
                Text("Ideal")
                    .font(.system(size: 20, weight: .heavy, design: .rounded))
                    .foregroundStyle(Paleta.tinta(esquema))
                Text(datos.compartida ? "Abre la app y elige tus círculos." : "Este widget no puede ver los datos de la app. Reinstala Ideal con AltStore conservando las extensiones.")
                    .font(.system(size: 13, weight: .medium))
                    .foregroundStyle(Paleta.suave(esquema))
                    .multilineTextAlignment(.center)
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)
        } else {
            GeometryReader { geo in
                let conCabeza = familia != .systemSmall
                let altoCabeza: CGFloat = conCabeza ? 24 : 0
                let separacion: CGFloat = conCabeza ? 10 : 0
                let hueco: CGFloat = familia == .systemLarge ? 12 : 9
                let r = Rejilla.mejor(n: visibles.count, ancho: geo.size.width, alto: geo.size.height - altoCabeza - separacion, hueco: hueco)
                let lado = max(min(r.lado, 118), 10)
                VStack(spacing: separacion) {
                    if conCabeza { CabezaView(datos: datos).frame(height: altoCabeza) }
                    VStack(spacing: hueco) {
                        ForEach(0..<r.filas, id: \.self) { fila in
                            HStack(spacing: hueco) {
                                ForEach(Array(visibles[(fila * r.columnas)..<min((fila + 1) * r.columnas, visibles.count)])) { h in
                                    Button(intent: TocarCirculoIntent(id: h.id)) {
                                        MonedaView(habito: h, cuenta: Motor.cuenta(datos.cuentas, h.id), lado: lado)
                                    }
                                    .buttonStyle(.plain)
                                }
                            }
                        }
                    }
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
                }
            }
        }
    }
}

/// El widget completo, con su fondo.
struct VistaWidget: View {
    let datos: DatosWidget
    @Environment(\.widgetFamily) private var familia
    @Environment(\.colorScheme) private var esquema

    var body: some View {
        TableroView(datos: datos, familia: familia)
            .containerBackground(for: .widget) { Paleta.fondo(esquema) }
    }
}
