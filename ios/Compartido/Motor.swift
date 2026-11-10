// Las reglas de los círculos, iguales a las de web/motor.js.
// pruebas/casos.json comprueba que esta versión y la de la web den el mismo resultado.
import Foundation

enum Motor {
    static let maxCuenta = 99
    static let maxToques = 400
    static let maxHueco = 400

    /// Calendario normal (gregoriano) con la hora local, sin importar cómo esté configurado el teléfono.
    static var calendario: Calendar {
        var c = Calendar(identifier: .gregorian)
        c.timeZone = .current
        return c
    }
    private static var calendarioFijo: Calendar {
        var c = Calendar(identifier: .gregorian)
        c.timeZone = TimeZone(identifier: "UTC")!
        return c
    }

    // MARK: Fechas

    private static func clave(_ f: Date, _ cal: Calendar) -> String {
        let c = cal.dateComponents([.year, .month, .day], from: f)
        return String(format: "%d-%02d-%02d", c.year ?? 0, c.month ?? 0, c.day ?? 0)
    }

    /// Día al que pertenece un momento. Antes de la hora de reinicio todavía cuenta como el día anterior.
    static func claveDia(_ momento: Date, horaReinicio: Int, calendario cal: Calendar = Motor.calendario) -> String {
        var f = cal.startOfDay(for: momento)
        if cal.component(.hour, from: momento) < horaReinicio {
            f = cal.date(byAdding: .day, value: -1, to: f) ?? f
        }
        return clave(f, cal)
    }

    static func sumarDias(_ clave: String, _ n: Int) -> String {
        let p = clave.split(separator: "-").compactMap { Int($0) }
        guard p.count == 3 else { return clave }
        let cal = calendarioFijo
        guard let f = cal.date(from: DateComponents(year: p[0], month: p[1], day: p[2], hour: 12)),
              let g = cal.date(byAdding: .day, value: n, to: f) else { return clave }
        return self.clave(g, cal)
    }

    static func siguienteReinicio(despuesDe momento: Date, horaReinicio: Int, calendario cal: Calendar = Motor.calendario) -> Date {
        cal.nextDate(after: momento, matching: DateComponents(hour: horaReinicio, minute: 0, second: 0), matchingPolicy: .nextTime)
            ?? momento.addingTimeInterval(86_400)
    }

    // MARK: Cuentas

    static func cuenta(_ cuentas: [String: Int]?, _ id: String) -> Int {
        let c = cuentas?[id] ?? 0
        return c > 0 ? min(c, maxCuenta) : 0
    }

    /// Cuánto del círculo se pinta (0 a 1).
    static func valor(tipo: String, pasos: Int, c: Int) -> Double {
        if tipo == "limite" { return pasos <= 0 ? (c > 0 ? 1 : 0) : min(Double(c) / Double(pasos), 1) }
        return pasos <= 0 ? 0 : Double(min(c, pasos)) / Double(pasos)
    }

    /// Cuánto cuenta para el día (0 a 1). Una meta vale lo que llevas; un límite vale completo mientras no lo pases.
    static func cumplimiento(tipo: String, pasos: Int, c: Int) -> Double {
        if tipo == "limite" { return c <= pasos ? 1 : Double(pasos) / Double(c) }
        return pasos <= 0 ? 0 : Double(min(c, pasos)) / Double(pasos)
    }

    static func excedido(tipo: String, pasos: Int, c: Int) -> Bool { tipo == "limite" && c > pasos }

    /// Porcentaje del día. Sin círculos no hay porcentaje.
    static func puntaje(_ items: [Foto]) -> Int? {
        guard !items.isEmpty else { return nil }
        var s = 0.0
        for it in items { s += cumplimiento(tipo: it.t, pasos: it.p, c: it.c) }
        return Int((s / Double(items.count) * 100 + 0.5).rounded(.down))
    }

    /// Día redondo: todo cumplido.
    static func redondo(_ items: [Foto]) -> Bool {
        !items.isEmpty && items.allSatisfy { cumplimiento(tipo: $0.t, pasos: $0.p, c: $0.c) >= 1 }
    }

    // MARK: El día

    static func foto(_ config: Config, _ cuentas: [String: Int]?) -> [Foto] {
        config.habitos.map { Foto(id: $0.id, e: $0.emoji, n: $0.nombre, p: $0.pasos, c: cuenta(cuentas, $0.id), t: $0.tipo) }
    }

    /// Si ya cambió el día: guarda el anterior en el registro y deja el de hoy en ceros.
    @discardableResult
    static func ponerAlDia(_ e: inout Estado, dia: String) -> Bool {
        guard let hoy = e.hoy, !hoy.dia.isEmpty else { e.hoy = Hoy(dia: dia); return true }
        if dia <= hoy.dia { return false }
        if !e.config.habitos.isEmpty {
            e.historial[hoy.dia] = DiaGuardado(h: foto(e.config, hoy.cuentas))
            var d = sumarDias(hoy.dia, 1), n = 0
            while d < dia && n < maxHueco {
                e.historial[d] = DiaGuardado(h: foto(e.config, nil))
                d = sumarDias(d, 1); n += 1
            }
        }
        e.hoy = Hoy(dia: dia)
        return true
    }

    // MARK: Toques

    /// Un toque avanza un paso. Una meta ya completa no avanza más; un límite sigue contando.
    @discardableResult
    static func tocar(_ e: inout Estado, id: String) -> Bool {
        guard var hoy = e.hoy, let h = e.config.habitos.first(where: { $0.id == id }) else { return false }
        let c = cuenta(hoy.cuentas, id)
        let tope = h.esLimite ? maxCuenta : h.pasos
        if c >= tope { return false }
        hoy.cuentas[id] = c + 1
        hoy.toques.append(id)
        if hoy.toques.count > maxToques { hoy.toques.removeFirst(hoy.toques.count - maxToques) }
        e.hoy = hoy
        return true
    }

    /// Deshace el último toque del día. Devuelve el id del círculo, o nil si no había nada que deshacer.
    @discardableResult
    static func deshacer(_ e: inout Estado) -> String? {
        guard var hoy = e.hoy else { return nil }
        defer { e.hoy = hoy }
        while let id = hoy.toques.popLast() {
            let c = cuenta(hoy.cuentas, id)
            if c > 0, e.config.habitos.contains(where: { $0.id == id }) {
                if c - 1 > 0 { hoy.cuentas[id] = c - 1 } else { hoy.cuentas.removeValue(forKey: id) }
                return id
            }
        }
        return nil
    }
}
