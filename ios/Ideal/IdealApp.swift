// La app de iPhone. Muestra las mismas pantallas que la versión web (carpeta web, incluida dentro de la app,
// así que no necesita internet) y guarda los datos donde también los ve el widget.
import SwiftUI
import WebKit
import WidgetKit
import UIKit

@main
struct IdealApp: App {
    var body: some Scene {
        WindowGroup {
            VistaWeb()
                .ignoresSafeArea()
                .background(Color(uiColor: VistaWeb.fondo).ignoresSafeArea())
        }
    }
}

struct VistaWeb: UIViewRepresentable {
    /// Mismo fondo que la app web, para que no se vea un destello al abrir.
    static let fondo = UIColor { rasgos in
        rasgos.userInterfaceStyle == .dark ? .black : UIColor(red: 0.933, green: 0.941, blue: 0.957, alpha: 1)
    }

    func makeCoordinator() -> Puente { Puente() }

    func makeUIView(context: Context) -> WKWebView {
        let ajustes = WKWebViewConfiguration()
        ajustes.userContentController.addScriptMessageHandler(context.coordinator, contentWorld: .page, name: "ideal")
        let web = WKWebView(frame: .zero, configuration: ajustes)
        web.isOpaque = false
        web.backgroundColor = Self.fondo
        web.scrollView.backgroundColor = Self.fondo
        web.scrollView.contentInsetAdjustmentBehavior = .never
        web.allowsLinkPreview = false
        web.navigationDelegate = context.coordinator
        context.coordinator.web = web
        if let inicio = Bundle.main.url(forResource: "index", withExtension: "html", subdirectory: "web") {
            web.loadFileURL(inicio, allowingReadAccessTo: inicio.deletingLastPathComponent())
        }
        return web
    }

    func updateUIView(_ web: WKWebView, context: Context) {}
}

/// Conecta las pantallas (JavaScript) con el teléfono: guardar, leer, vibrar y compartir el respaldo.
final class Puente: NSObject, WKScriptMessageHandlerWithReply, WKNavigationDelegate {
    weak var web: WKWebView?

    override init() {
        super.init()
        // Al volver a la app se vuelve a leer lo guardado: el widget pudo haber cambiado algo.
        NotificationCenter.default.addObserver(self, selector: #selector(alVolver), name: UIApplication.didBecomeActiveNotification, object: nil)
    }

    @objc private func alVolver() {
        web?.evaluateJavaScript("window.idealAlVolver && window.idealAlVolver()", completionHandler: nil)
    }

    func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage,
                               replyHandler: @escaping (Any?, String?) -> Void) {
        guard let cuerpo = message.body as? [String: Any], let tipo = cuerpo["tipo"] as? String else {
            replyHandler(nil, "Mensaje sin tipo")
            return
        }
        switch tipo {
        case "leer":
            var todo: [String: Any] = [:]
            for clave in ["config", "hoy", "historial"] { todo[clave] = Almacen.leerTexto(clave) ?? NSNull() }
            replyHandler(todo, nil)
        case "guardar":
            if let clave = cuerpo["clave"] as? String, let valor = cuerpo["valor"] as? String {
                Almacen.guardarTexto(clave, valor)
                WidgetCenter.shared.reloadAllTimelines()
            }
            replyHandler(true, nil)
        case "borrar":
            Almacen.borrarTodo()
            WidgetCenter.shared.reloadAllTimelines()
            replyHandler(true, nil)
        case "vibrar":
            vibrar(cuerpo["estilo"] as? String ?? "ligero")
            replyHandler(true, nil)
        case "compartir":
            compartir(nombre: cuerpo["nombre"] as? String ?? "ideal-respaldo.json", texto: cuerpo["texto"] as? String ?? "")
            replyHandler(true, nil)
        default:
            replyHandler(nil, "Mensaje desconocido")
        }
    }

    private func vibrar(_ estilo: String) {
        switch estilo {
        case "exito": UINotificationFeedbackGenerator().notificationOccurred(.success)
        case "tope": UINotificationFeedbackGenerator().notificationOccurred(.warning)
        default: UIImpactFeedbackGenerator(style: .light).impactOccurred()
        }
    }

    /// Abre la hoja de compartir con el archivo de respaldo (para guardarlo en Archivos, mandarlo, etc.).
    private func compartir(nombre: String, texto: String) {
        let limpio = nombre.replacingOccurrences(of: "/", with: "-")
        let url = FileManager.default.temporaryDirectory.appendingPathComponent(limpio)
        guard (try? Data(texto.utf8).write(to: url, options: .atomic)) != nil, let web = web else { return }
        let hoja = UIActivityViewController(activityItems: [url], applicationActivities: nil)
        hoja.popoverPresentationController?.sourceView = web
        hoja.popoverPresentationController?.sourceRect = CGRect(x: web.bounds.midX, y: web.bounds.midY, width: 1, height: 1)
        web.window?.rootViewController?.present(hoja, animated: true)
    }

    /// Los enlaces a internet se abren en Safari; dentro de la app solo viven sus propias pantallas.
    func webView(_ webView: WKWebView, decidePolicyFor navigationAction: WKNavigationAction,
                 decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
        if let url = navigationAction.request.url, let esquema = url.scheme?.lowercased(), esquema == "http" || esquema == "https" {
            UIApplication.shared.open(url)
            decisionHandler(.cancel)
            return
        }
        decisionHandler(.allow)
    }
}
