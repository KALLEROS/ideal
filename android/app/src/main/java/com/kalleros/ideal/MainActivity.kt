// La app de Android. Muestra las mismas pantallas que la versión web (carpeta web, incluida dentro de la app,
// así que no necesita internet) y guarda los datos donde también los ve el widget.
package com.kalleros.ideal

import android.annotation.SuppressLint
import android.app.Activity
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.view.HapticFeedbackConstants
import android.view.ViewGroup
import android.view.WindowInsets
import android.webkit.JavascriptInterface
import android.webkit.ValueCallback
import android.webkit.WebChromeClient
import android.webkit.WebResourceRequest
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.FrameLayout

class MainActivity : Activity() {
    private lateinit var web: WebView
    private var eleccionDeArchivo: ValueCallback<Array<Uri>>? = null
    private var respaldoPendiente: String? = null

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        val marco = FrameLayout(this)
        marco.setBackgroundColor(getColor(R.color.fondo))
        web = WebView(this)
        web.setBackgroundColor(getColor(R.color.fondo))
        marco.addView(web, ViewGroup.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT))
        setContentView(marco)

        // La pantalla llega hasta las orillas; se deja libre el espacio de la barra de estado y la de navegación.
        marco.setOnApplyWindowInsetsListener { vista, bordes ->
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                val b = bordes.getInsets(WindowInsets.Type.systemBars() or WindowInsets.Type.displayCutout() or WindowInsets.Type.ime())
                vista.setPadding(b.left, b.top, b.right, b.bottom)
            } else {
                @Suppress("DEPRECATION")
                vista.setPadding(bordes.systemWindowInsetLeft, bordes.systemWindowInsetTop, bordes.systemWindowInsetRight, bordes.systemWindowInsetBottom)
            }
            bordes
        }

        web.settings.javaScriptEnabled = true
        web.settings.domStorageEnabled = true
        web.settings.allowFileAccess = true
        web.settings.textZoom = 100
        web.overScrollMode = WebView.OVER_SCROLL_NEVER
        web.addJavascriptInterface(Puente(), "IdealAndroid")
        web.webViewClient = object : WebViewClient() {
            // Los enlaces a internet se abren en el navegador; dentro de la app solo viven sus propias pantallas.
            override fun shouldOverrideUrlLoading(view: WebView, request: WebResourceRequest): Boolean {
                val esquema = request.url.scheme ?: ""
                if (esquema == "http" || esquema == "https") {
                    try { startActivity(Intent(Intent.ACTION_VIEW, request.url)) } catch (x: Exception) { }
                    return true
                }
                return false
            }
        }
        web.webChromeClient = object : WebChromeClient() {
            // Para "Restaurar un respaldo": abre el selector de archivos del teléfono.
            override fun onShowFileChooser(view: WebView, alElegir: ValueCallback<Array<Uri>>, parametros: FileChooserParams): Boolean {
                eleccionDeArchivo?.onReceiveValue(null)
                eleccionDeArchivo = alElegir
                return try {
                    val pedir = Intent(Intent.ACTION_OPEN_DOCUMENT).addCategory(Intent.CATEGORY_OPENABLE).setType("*/*")
                    startActivityForResult(pedir, PEDIR_ARCHIVO)
                    true
                } catch (x: Exception) {
                    eleccionDeArchivo = null
                    false
                }
            }
        }
        web.loadUrl("file:///android_asset/web/index.html")
    }

    override fun onResume() {
        super.onResume()
        // Al volver a la app se vuelve a leer lo guardado: el widget pudo haber cambiado algo.
        web.evaluateJavascript("window.idealAlVolver && window.idealAlVolver()", null)
    }

    @Deprecated("Deprecated in Java")
    override fun onBackPressed() {
        if (web.canGoBack()) web.goBack() else super.onBackPressed()
    }

    @Deprecated("Deprecated in Java")
    override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        super.onActivityResult(requestCode, resultCode, data)
        if (requestCode == PEDIR_ARCHIVO) {
            val uri = if (resultCode == RESULT_OK) data?.data else null
            eleccionDeArchivo?.onReceiveValue(if (uri != null) arrayOf(uri) else null)
            eleccionDeArchivo = null
        } else if (requestCode == GUARDAR_RESPALDO) {
            val uri = if (resultCode == RESULT_OK) data?.data else null
            val texto = respaldoPendiente
            respaldoPendiente = null
            if (uri != null && texto != null) {
                try { contentResolver.openOutputStream(uri)?.use { it.write(texto.toByteArray(Charsets.UTF_8)) } } catch (x: Exception) { }
            }
        }
    }

    /** Lo que las pantallas (JavaScript) le pueden pedir al teléfono. */
    inner class Puente {
        @JavascriptInterface
        fun leer(clave: String): String = Almacen.leerTexto(this@MainActivity, clave) ?: ""

        @JavascriptInterface
        fun guardar(clave: String, valor: String) {
            Almacen.guardarTexto(this@MainActivity, clave, valor)
            WidgetIdeal.actualizarTodos(this@MainActivity)
        }

        @JavascriptInterface
        fun borrar() {
            Almacen.borrarTodo(this@MainActivity)
            WidgetIdeal.actualizarTodos(this@MainActivity)
        }

        @JavascriptInterface
        fun vibrar(tipo: String) {
            web.post {
                web.performHapticFeedback(if (tipo == "ligero") HapticFeedbackConstants.VIRTUAL_KEY else HapticFeedbackConstants.LONG_PRESS)
            }
        }

        /** Guarda el respaldo como archivo donde la persona elija (Descargas, Drive, etc.). */
        @JavascriptInterface
        fun compartir(nombre: String, texto: String) {
            runOnUiThread {
                respaldoPendiente = texto
                try {
                    val pedir = Intent(Intent.ACTION_CREATE_DOCUMENT).addCategory(Intent.CATEGORY_OPENABLE)
                        .setType("application/json").putExtra(Intent.EXTRA_TITLE, nombre)
                    startActivityForResult(pedir, GUARDAR_RESPALDO)
                } catch (x: Exception) {
                    respaldoPendiente = null
                }
            }
        }
    }

    companion object {
        private const val PEDIR_ARCHIVO = 7
        private const val GUARDAR_RESPALDO = 8
    }
}
