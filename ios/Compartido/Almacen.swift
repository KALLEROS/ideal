// Guarda los tres documentos de Ideal (config, hoy, historial) en la carpeta que comparten la app y el widget.
// Nada sale del teléfono.
import Foundation

enum Almacen {
    static let grupoBase = "group.com.kalleros.ideal"
    private static let claves = ["config", "hoy", "historial"]

    /// Las pruebas ponen aquí una carpeta temporal.
    static var carpetaDePrueba: URL?

    private static let resuelta: (url: URL, compartida: Bool) = {
        let fm = FileManager.default
        for grupo in gruposPosibles() {
            if let url = fm.containerURL(forSecurityApplicationGroupIdentifier: grupo) { return (url, true) }
        }
        // Sin carpeta compartida la app funciona sola, pero el widget no puede ver sus datos.
        let propia = (fm.urls(for: .applicationSupportDirectory, in: .userDomainMask).first ?? fm.temporaryDirectory)
            .appendingPathComponent("Ideal", isDirectory: true)
        try? fm.createDirectory(at: propia, withIntermediateDirectories: true)
        return (propia, false)
    }()

    static var carpeta: URL { carpetaDePrueba ?? resuelta.url }
    /// false cuando la app se instaló de una forma que no deja compartir datos con el widget.
    static var hayCarpetaCompartida: Bool { carpetaDePrueba != nil || resuelta.compartida }

    /// Al instalar la app con una cuenta gratuita de Apple (AltStore, SideStore, Sideloadly) el nombre del grupo
    /// cambia: se le agrega el identificador del equipo. El nombre real se busca donde lo deja el instalador.
    private static func gruposPosibles() -> [String] {
        var lista: [String] = []
        if let alt = Bundle.main.object(forInfoDictionaryKey: "ALTAppGroups") as? [String] { lista += alt }
        lista += gruposDelPerfil()
        lista.append(grupoBase)
        let propios = lista.filter { $0.contains(grupoBase) }
        var vistos = Set<String>()
        return (propios + lista).filter { vistos.insert($0).inserted }
    }

    /// Grupos que autoriza el perfil con el que se firmó la app (embedded.mobileprovision).
    private static func gruposDelPerfil() -> [String] {
        guard let url = Bundle.main.url(forResource: "embedded", withExtension: "mobileprovision"),
              let datos = try? Data(contentsOf: url),
              let inicio = datos.range(of: Data("<?xml".utf8)),
              let fin = datos.range(of: Data("</plist>".utf8)), inicio.lowerBound < fin.upperBound,
              let perfil = try? PropertyListSerialization.propertyList(from: datos.subdata(in: inicio.lowerBound..<fin.upperBound), format: nil) as? [String: Any],
              let permisos = perfil["Entitlements"] as? [String: Any],
              let grupos = permisos["com.apple.security.application-groups"] as? [String] else { return [] }
        return grupos
    }

    // MARK: Texto (lo que usa la app web)

    private static func archivo(_ clave: String) -> URL? {
        claves.contains(clave) ? carpeta.appendingPathComponent(clave + ".json") : nil
    }

    static func leerTexto(_ clave: String) -> String? {
        guard let url = archivo(clave), let datos = try? Data(contentsOf: url) else { return nil }
        return String(data: datos, encoding: .utf8)
    }

    static func guardarTexto(_ clave: String, _ texto: String) {
        guard let url = archivo(clave) else { return }
        try? Data(texto.utf8).write(to: url, options: .atomic)
    }

    static func borrarTodo() {
        for clave in claves { if let url = archivo(clave) { try? FileManager.default.removeItem(at: url) } }
    }

    // MARK: Estado (lo que usa el widget)

    private static func leer<T: Decodable>(_ clave: String, _ tipo: T.Type) -> T? {
        guard let url = archivo(clave), let datos = try? Data(contentsOf: url) else { return nil }
        return try? JSONDecoder().decode(tipo, from: datos)
    }
    private static func guardar<T: Encodable>(_ clave: String, _ valor: T) {
        guard let url = archivo(clave), let datos = try? JSONEncoder().encode(valor) else { return }
        try? datos.write(to: url, options: .atomic)
    }

    static func leerEstado() -> Estado {
        Estado(config: leer("config", Config.self) ?? Config(),
               hoy: leer("hoy", Hoy.self),
               historial: leer("historial", [String: DiaGuardado].self) ?? [:])
    }
    static func guardar(hoy: Hoy) { guardar("hoy", hoy) }
    static func guardar(historial: [String: DiaGuardado]) { guardar("historial", historial) }

    /// Lee lo guardado y, si ya cambió el día, pasa el anterior al registro y deja hoy en ceros.
    static func estadoAlDia(ahora: Date = Date()) -> Estado {
        var e = leerEstado()
        let dia = Motor.claveDia(ahora, horaReinicio: e.config.horaReinicio)
        if Motor.ponerAlDia(&e, dia: dia) {
            guardar(historial: e.historial)
            if let hoy = e.hoy { guardar(hoy: hoy) }
        }
        return e
    }
}
