// Lo que pasa al tocar el widget. iOS ejecuta esto sin abrir la app y después vuelve a dibujar el widget.
import AppIntents
import WidgetKit

struct TocarCirculoIntent: AppIntent {
    static let title: LocalizedStringResource = "Avanzar un círculo"
    static let isDiscoverable = false

    @Parameter(title: "Círculo")
    var id: String

    init() {}
    init(id: String) { self.id = id }

    func perform() async throws -> some IntentResult {
        var e = Almacen.estadoAlDia()
        if Motor.tocar(&e, id: id), let hoy = e.hoy { Almacen.guardar(hoy: hoy) }
        WidgetCenter.shared.reloadAllTimelines()
        return .result()
    }
}

struct DeshacerIntent: AppIntent {
    static let title: LocalizedStringResource = "Deshacer el último toque"
    static let isDiscoverable = false

    func perform() async throws -> some IntentResult {
        var e = Almacen.estadoAlDia()
        if Motor.deshacer(&e) != nil, let hoy = e.hoy { Almacen.guardar(hoy: hoy) }
        WidgetCenter.shared.reloadAllTimelines()
        return .result()
    }
}
