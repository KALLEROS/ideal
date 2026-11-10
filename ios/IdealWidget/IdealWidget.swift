// El widget de Ideal para la pantalla de inicio. Cada moneda es un botón: un toque avanza un paso sin abrir la app.
import WidgetKit
import SwiftUI

struct Entrada: TimelineEntry {
    let date: Date
    let datos: DatosWidget
}

struct Proveedor: TimelineProvider {
    func placeholder(in context: Context) -> Entrada {
        Entrada(date: Date(), datos: .ejemplo)
    }

    func getSnapshot(in context: Context, completion: @escaping (Entrada) -> Void) {
        let datos = DatosWidget(estado: Almacen.estadoAlDia())
        completion(Entrada(date: Date(), datos: context.isPreview && datos.habitos.isEmpty ? .ejemplo : datos))
    }

    /// Dos momentos: ahora, y la hora de reinicio (a esa hora el widget amanece en ceros aunque no abras la app).
    func getTimeline(in context: Context, completion: @escaping (Timeline<Entrada>) -> Void) {
        let ahora = Date()
        let estado = Almacen.estadoAlDia(ahora: ahora)
        let reinicio = Motor.siguienteReinicio(despuesDe: ahora, horaReinicio: estado.config.horaReinicio)
        let hoy = DatosWidget(estado: estado)
        var manana = hoy
        manana.cuentas = [:]
        manana.hayToques = false
        completion(Timeline(entries: [Entrada(date: ahora, datos: hoy), Entrada(date: reinicio, datos: manana)],
                            policy: .after(reinicio)))
    }
}

struct IdealWidget: Widget {
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: "IdealCirculos", provider: Proveedor()) { entrada in
            VistaWidget(datos: entrada.datos)
        }
        .configurationDisplayName("Ideal")
        .description("Toca un círculo para avanzar en tu rutina del día.")
        .supportedFamilies([.systemLarge, .systemMedium, .systemSmall])
    }
}

@main
struct IdealWidgetBundle: WidgetBundle {
    var body: some Widget {
        IdealWidget()
    }
}
