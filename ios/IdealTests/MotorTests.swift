// Comprueba que el motor en Swift dé los mismos resultados que el de la web, con los casos de pruebas/casos.json.
import XCTest
@testable import Ideal

private struct Archivo: Decodable {
    let configs: [String: Config]
    let claves: [CasoClave]
    let casos: [Caso]
    let rachas: [CasoRacha]
}
private struct EsperaRacha: Decodable {
    let dias: Int
    let encendida: Bool
}
private struct CasoRacha: Decodable {
    let nombre: String
    let dia: String
    let historial: [String: DiaGuardado]
    let hoy: [Foto]
    let espera: EsperaRacha
}
private struct CasoClave: Decodable {
    let y: Int
    let m: Int
    let d: Int
    let h: Int
    let reinicio: Int
    let espera: String
}
private struct Paso: Decodable {
    let op: String
    let dia: String?
    let id: String?
    let cambia: Bool?
    let da: String?
}
private struct Espera: Decodable {
    let hoy: Hoy
    let historial: [String: DiaGuardado]
    let puntaje: Int?
    let redondo: Bool
}
private struct Caso: Decodable {
    let nombre: String
    let config: String
    let hoy: Hoy?
    let historial: [String: DiaGuardado]
    let pasos: [Paso]
    let espera: Espera
}

final class MotorTests: XCTestCase {
    private func archivo() throws -> Archivo {
        let url = try XCTUnwrap(Bundle(for: MotorTests.self).url(forResource: "casos", withExtension: "json"))
        return try JSONDecoder().decode(Archivo.self, from: Data(contentsOf: url))
    }

    func testClaveDia() throws {
        let cal = Motor.calendario
        for c in try archivo().claves {
            let momento = try XCTUnwrap(cal.date(from: DateComponents(year: c.y, month: c.m, day: c.d, hour: c.h, minute: 30)))
            XCTAssertEqual(Motor.claveDia(momento, horaReinicio: c.reinicio), c.espera)
        }
    }

    func testCasosCompartidos() throws {
        let datos = try archivo()
        XCTAssertFalse(datos.casos.isEmpty)
        for caso in datos.casos {
            var e = Estado(config: try XCTUnwrap(datos.configs[caso.config]), hoy: caso.hoy, historial: caso.historial)
            for p in caso.pasos {
                switch p.op {
                case "dia": XCTAssertEqual(Motor.ponerAlDia(&e, dia: p.dia ?? ""), p.cambia, caso.nombre)
                case "tocar": XCTAssertEqual(Motor.tocar(&e, id: p.id ?? ""), p.cambia, caso.nombre)
                case "deshacer": XCTAssertEqual(Motor.deshacer(&e), p.da, caso.nombre)
                default: XCTFail("Paso desconocido: " + p.op)
                }
            }
            XCTAssertEqual(e.hoy, caso.espera.hoy, caso.nombre)
            XCTAssertEqual(e.historial, caso.espera.historial, caso.nombre)
            let hoy = Motor.foto(e.config, e.hoy?.cuentas)
            XCTAssertEqual(Motor.puntaje(hoy), caso.espera.puntaje, caso.nombre)
            XCTAssertEqual(Motor.redondo(hoy), caso.espera.redondo, caso.nombre)
        }
    }

    func testRachas() throws {
        let rachas = try archivo().rachas
        XCTAssertFalse(rachas.isEmpty)
        for caso in rachas {
            let r = Motor.racha(caso.historial, dia: caso.dia, hoy: caso.hoy)
            XCTAssertEqual(r.dias, caso.espera.dias, caso.nombre)
            XCTAssertEqual(r.encendida, caso.espera.encendida, caso.nombre)
        }
    }

    func testSiguienteReinicio() throws {
        let cal = Motor.calendario
        let antes = try XCTUnwrap(cal.date(from: DateComponents(year: 2026, month: 11, day: 10, hour: 2, minute: 15)))
        let r = cal.dateComponents([.day, .hour, .minute], from: Motor.siguienteReinicio(despuesDe: antes, horaReinicio: 4))
        XCTAssertEqual(r.day, 10)
        XCTAssertEqual(r.hour, 4)
        XCTAssertEqual(r.minute, 0)
        let justo = try XCTUnwrap(cal.date(from: DateComponents(year: 2026, month: 11, day: 10, hour: 4)))
        XCTAssertEqual(cal.component(.day, from: Motor.siguienteReinicio(despuesDe: justo, horaReinicio: 4)), 11)
    }

    /// Lo que guarda la app web lo entiende el widget, y lo que guarda el widget lo entiende la app web.
    func testAlmacenIdaYVuelta() throws {
        let carpeta = FileManager.default.temporaryDirectory.appendingPathComponent("ideal-" + UUID().uuidString, isDirectory: true)
        try FileManager.default.createDirectory(at: carpeta, withIntermediateDirectories: true)
        Almacen.carpetaDePrueba = carpeta
        defer {
            Almacen.carpetaDePrueba = nil
            try? FileManager.default.removeItem(at: carpeta)
        }

        let config = """
        {"v":1,"horaReinicio":0,"tema":"auto","empezado":true,"habitos":[{"id":"agua","emoji":"💧","nombre":"Agua","pasos":8,"tipo":"meta","color":"#2F9BFF"}]}
        """
        let hoyViejo = """
        {"dia":"2020-01-01","cuentas":{"agua":3},"toques":["agua","agua","agua"]}
        """
        Almacen.guardarTexto("config", config)
        Almacen.guardarTexto("hoy", hoyViejo)

        var e = Almacen.estadoAlDia()
        XCTAssertEqual(e.config.habitos.first?.nombre, "Agua")
        XCTAssertEqual(e.historial["2020-01-01"]?.h.first?.c, 3, "El día viejo pasa al registro")
        XCTAssertEqual(e.hoy?.cuentas, [:], "Hoy empieza en ceros")
        XCTAssertTrue(Motor.tocar(&e, id: "agua"))
        Almacen.guardar(hoy: try XCTUnwrap(e.hoy))

        let texto = try XCTUnwrap(Almacen.leerTexto("hoy"))
        let json = try XCTUnwrap(JSONSerialization.jsonObject(with: Data(texto.utf8)) as? [String: Any])
        XCTAssertEqual((json["cuentas"] as? [String: Int])?["agua"], 1)
        XCTAssertEqual(json["toques"] as? [String], ["agua"])
        Almacen.borrarTodo()
        XCTAssertNil(Almacen.leerTexto("config"))
    }
}
