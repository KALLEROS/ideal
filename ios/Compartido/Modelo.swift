// Los datos de Ideal, con la misma forma que usa la app web (web/motor.js).
import Foundation

struct Habito: Codable, Equatable, Identifiable {
    var id: String
    var emoji: String
    var nombre: String
    var pasos: Int
    var tipo: String
    var color: String

    var esLimite: Bool { tipo == "limite" }

    init(id: String, emoji: String, nombre: String, pasos: Int, tipo: String = "meta", color: String) {
        self.id = id; self.emoji = emoji; self.nombre = nombre; self.pasos = pasos; self.tipo = tipo; self.color = color
    }

    // Si falta algún dato se usa uno razonable en vez de fallar: el widget nunca debe quedarse en blanco.
    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        id = try c.decode(String.self, forKey: .id)
        emoji = (try? c.decode(String.self, forKey: .emoji)) ?? "⭐"
        nombre = (try? c.decode(String.self, forKey: .nombre)) ?? ""
        pasos = (try? c.decode(Int.self, forKey: .pasos)) ?? 1
        tipo = (try? c.decode(String.self, forKey: .tipo)) ?? "meta"
        color = (try? c.decode(String.self, forKey: .color)) ?? "#8E8E93"
    }
}

struct Config: Codable, Equatable {
    var habitos: [Habito] = []
    var horaReinicio: Int = 4

    init() {}
    init(habitos: [Habito], horaReinicio: Int) { self.habitos = habitos; self.horaReinicio = horaReinicio }
    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        habitos = (try? c.decode([Habito].self, forKey: .habitos)) ?? []
        horaReinicio = (try? c.decode(Int.self, forKey: .horaReinicio)) ?? 4
    }
}

struct Hoy: Codable, Equatable {
    var dia: String
    var cuentas: [String: Int] = [:]
    var toques: [String] = []

    init(dia: String) { self.dia = dia }
    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        dia = try c.decode(String.self, forKey: .dia)
        cuentas = (try? c.decode([String: Int].self, forKey: .cuentas)) ?? [:]
        toques = (try? c.decode([String].self, forKey: .toques)) ?? []
    }
}

/// Un círculo tal como quedó en un día del registro.
struct Foto: Codable, Equatable {
    var id: String
    var e: String
    var n: String
    var p: Int
    var c: Int
    var t: String
}

struct DiaGuardado: Codable, Equatable {
    var h: [Foto]
}

struct Estado {
    var config = Config()
    var hoy: Hoy?
    var historial: [String: DiaGuardado] = [:]
}
