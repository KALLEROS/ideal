// Toma fotos del widget (claro, oscuro y varios tamaños) para poder revisarlo sin tener un iPhone a la mano.
// Las deja en /tmp/ideal-fotos; GitHub las guarda con cada compilación.
import XCTest
import SwiftUI
import WidgetKit
@testable import Ideal

@MainActor
final class FotosWidgetTests: XCTestCase {
    private func muchos() -> DatosWidget {
        var d = DatosWidget.ejemplo
        d.habitos += [
            Habito(id: "piel", emoji: "🧴", nombre: "Piel", pasos: 2, color: "#FF5FA2"),
            Habito(id: "vitaminas", emoji: "💊", nombre: "Vitaminas", pasos: 1, color: "#FF9431"),
            Habito(id: "ejercicio", emoji: "🏋️", nombre: "Ejercicio", pasos: 1, color: "#FF6257"),
            Habito(id: "meditar", emoji: "🧘", nombre: "Meditar", pasos: 1, color: "#A66BFF"),
            Habito(id: "plantas", emoji: "🪴", nombre: "Regar plantas", pasos: 1, color: "#55C843"),
            Habito(id: "cigarro", emoji: "🚬", nombre: "Cigarro", pasos: 5, tipo: "limite", color: "#8E8E93"),
            Habito(id: "cafe", emoji: "☕", nombre: "Café", pasos: 3, tipo: "limite", color: "#C4915E")
        ]
        d.cuentas["piel"] = 1
        d.cuentas["vitaminas"] = 1
        d.cuentas["cigarro"] = 7
        d.cuentas["cafe"] = 2
        return d
    }

    private func redondo() -> DatosWidget {
        var d = DatosWidget.ejemplo
        for h in d.habitos { d.cuentas[h.id] = h.pasos }
        return d
    }

    private func fotografiar(_ nombre: String, _ familia: WidgetFamily, _ tam: CGSize, _ esquema: ColorScheme, _ datos: DatosWidget) throws {
        let carpeta = URL(fileURLWithPath: "/tmp/ideal-fotos", isDirectory: true)
        try FileManager.default.createDirectory(at: carpeta, withIntermediateDirectories: true)
        let vista = TableroView(datos: datos, familia: familia)
            .padding(16)
            .frame(width: tam.width, height: tam.height)
            .background(Paleta.fondo(esquema))
            .clipShape(RoundedRectangle(cornerRadius: 26, style: .continuous))
            .padding(22)
            .background(esquema == .dark ? Color(hex: "#30303A") : Color(hex: "#C5CBD6"))
            .environment(\.colorScheme, esquema)
        let foto = ImageRenderer(content: vista)
        foto.scale = 2
        let imagen = try XCTUnwrap(foto.uiImage, nombre)
        try XCTUnwrap(imagen.pngData()).write(to: carpeta.appendingPathComponent(nombre + ".png"))
    }

    func testFotosDelWidget() throws {
        let grande = CGSize(width: 364, height: 382)
        let mediano = CGSize(width: 364, height: 170)
        let chico = CGSize(width: 170, height: 170)
        try fotografiar("grande-oscuro", .systemLarge, grande, .dark, .ejemplo)
        try fotografiar("grande-claro", .systemLarge, grande, .light, .ejemplo)
        try fotografiar("grande-16-oscuro", .systemLarge, grande, .dark, muchos())
        try fotografiar("grande-redondo-oscuro", .systemLarge, grande, .dark, redondo())
        try fotografiar("mediano-oscuro", .systemMedium, mediano, .dark, .ejemplo)
        try fotografiar("chico-claro", .systemSmall, chico, .light, .ejemplo)
        try fotografiar("grande-vacio-oscuro", .systemLarge, grande, .dark, DatosWidget(habitos: [], cuentas: [:], hayToques: false))
    }

    func testRejilla() {
        XCTAssertEqual(Rejilla.mejor(n: 9, ancho: 332, alto: 316, hueco: 12).columnas, 3)
        XCTAssertEqual(Rejilla.mejor(n: 16, ancho: 332, alto: 316, hueco: 12).columnas, 4)
        XCTAssertEqual(Rejilla.mejor(n: 20, ancho: 332, alto: 316, hueco: 12).filas, 4)
        XCTAssertEqual(Rejilla.mejor(n: 4, ancho: 138, alto: 138, hueco: 9).columnas, 2)
    }
}
