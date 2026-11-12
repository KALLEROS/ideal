// El widget de Ideal para la pantalla de inicio de Android. Cada moneda es un botón:
// un toque avanza un paso sin abrir la app.
package com.kalleros.ideal

import android.app.AlarmManager
import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.content.res.Configuration
import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.LinearGradient
import android.graphics.Paint
import android.graphics.Path
import android.graphics.PorterDuff
import android.graphics.PorterDuffXfermode
import android.graphics.RectF
import android.graphics.Shader
import android.graphics.Typeface
import android.net.Uri
import android.os.Bundle
import android.view.View
import android.widget.RemoteViews
import java.util.Calendar
import kotlin.math.ceil
import kotlin.math.max
import kotlin.math.min
import kotlin.math.sin

class WidgetIdeal : AppWidgetProvider() {

    override fun onUpdate(ctx: Context, gestor: AppWidgetManager, ids: IntArray) {
        pintar(ctx, gestor, ids)
        programarReinicio(ctx)
    }

    override fun onAppWidgetOptionsChanged(ctx: Context, gestor: AppWidgetManager, id: Int, opciones: Bundle) {
        pintar(ctx, gestor, intArrayOf(id))
    }

    override fun onEnabled(ctx: Context) {
        programarReinicio(ctx)
    }

    override fun onReceive(ctx: Context, intent: Intent) {
        when (intent.action) {
            TOCAR -> {
                val id = intent.getStringExtra("id") ?: return
                val e = Almacen.estadoAlDia(ctx)
                if (Motor.tocar(e, id)) Almacen.guardarHoy(ctx, e)
                actualizarTodos(ctx)
            }
            DESHACER -> {
                val e = Almacen.estadoAlDia(ctx)
                if (Motor.deshacer(e) != null) Almacen.guardarHoy(ctx, e)
                actualizarTodos(ctx)
            }
            REINICIO -> {
                actualizarTodos(ctx)
                programarReinicio(ctx)
            }
            else -> super.onReceive(ctx, intent)
        }
    }

    companion object {
        private const val TOCAR = "com.kalleros.ideal.TOCAR"
        private const val DESHACER = "com.kalleros.ideal.DESHACER"
        private const val REINICIO = "com.kalleros.ideal.REINICIO"
        private const val MAX_MONEDAS = 20

        fun actualizarTodos(ctx: Context) {
            val gestor = AppWidgetManager.getInstance(ctx)
            val ids = gestor.getAppWidgetIds(ComponentName(ctx, WidgetIdeal::class.java))
            if (ids.isNotEmpty()) pintar(ctx, gestor, ids)
        }

        private fun aviso(ctx: Context, accion: String, id: String?): PendingIntent {
            val intent = Intent(ctx, WidgetIdeal::class.java).setAction(accion)
            if (id != null) intent.setData(Uri.parse("ideal://circulo/" + Uri.encode(id))).putExtra("id", id)
            return PendingIntent.getBroadcast(ctx, 0, intent, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
        }

        /** A la hora de reinicio el widget amanece en ceros aunque no se abra la app. */
        private fun programarReinicio(ctx: Context) {
            val e = Almacen.estadoAlDia(ctx)
            val cuando = Motor.siguienteReinicio(Calendar.getInstance(), e.horaReinicio).timeInMillis + 2000
            val alarmas = ctx.getSystemService(Context.ALARM_SERVICE) as AlarmManager
            alarmas.set(AlarmManager.RTC, cuando, aviso(ctx, REINICIO, null))
        }

        private fun pintar(ctx: Context, gestor: AppWidgetManager, ids: IntArray) {
            val e = Almacen.estadoAlDia(ctx)
            val noche = (ctx.resources.configuration.uiMode and Configuration.UI_MODE_NIGHT_MASK) == Configuration.UI_MODE_NIGHT_YES
            for (id in ids) gestor.updateAppWidget(id, vistas(ctx, e, noche, gestor.getAppWidgetOptions(id)))
        }

        private fun vistas(ctx: Context, e: Estado, noche: Boolean, opciones: Bundle?): RemoteViews {
            val raiz = RemoteViews(ctx.packageName, R.layout.widget_ideal)
            val abrir = PendingIntent.getActivity(ctx, 0, Intent(ctx, MainActivity::class.java), PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
            raiz.setOnClickPendingIntent(R.id.raiz, abrir)
            raiz.removeAllViews(R.id.filas)

            val visibles = e.habitos.take(MAX_MONEDAS)
            if (visibles.isEmpty()) {
                raiz.setViewVisibility(R.id.vacio, View.VISIBLE)
                raiz.setViewVisibility(R.id.filas, View.GONE)
                raiz.setViewVisibility(R.id.cabeza, View.GONE)
                return raiz
            }
            raiz.setViewVisibility(R.id.vacio, View.GONE)
            raiz.setViewVisibility(R.id.filas, View.VISIBLE)
            raiz.setViewVisibility(R.id.cabeza, View.VISIBLE)

            val redondo = Motor.redondo(e)
            raiz.setTextViewText(R.id.titulo, if (redondo) "Día redondo" else "Hoy")
            raiz.setTextColor(R.id.titulo, if (redondo) (if (noche) 0xFFFFCD1F.toInt() else 0xFFE0A800.toInt()) else ctx.getColor(R.color.tinta))
            raiz.setTextViewText(R.id.porcentaje, if (redondo) "" else "${Motor.puntaje(e) ?: 0}%")
            val racha = Motor.racha(e)
            if (racha.dias > 0) {
                raiz.setViewVisibility(R.id.fuego, View.VISIBLE)
                raiz.setImageViewBitmap(R.id.fuego, dibujarFuego(racha, ctx.resources.displayMetrics.density, noche))
                raiz.setContentDescription(R.id.fuego,
                    if (racha.encendida) "Racha de ${racha.dias} días, hoy ya cuenta" else "Racha de ${racha.dias} días, cumple todo hoy para seguirla")
            } else {
                raiz.setViewVisibility(R.id.fuego, View.GONE)
            }
            raiz.setViewVisibility(R.id.deshacer, if (e.toques.isEmpty()) View.INVISIBLE else View.VISIBLE)
            raiz.setOnClickPendingIntent(R.id.deshacer, aviso(ctx, DESHACER, null))

            // Tamaño del widget en la pantalla (en dp) para elegir cuántas columnas dejan las monedas más grandes.
            val densidad = ctx.resources.displayMetrics.density
            var ancho = opciones?.getInt(AppWidgetManager.OPTION_APPWIDGET_MIN_WIDTH, 0) ?: 0
            var alto = opciones?.getInt(AppWidgetManager.OPTION_APPWIDGET_MAX_HEIGHT, 0) ?: 0
            if (ancho <= 0) ancho = 300
            if (alto <= 0) alto = 300
            val areaAncho = ancho - 28f
            val areaAlto = alto - 28f - 34f
            val n = visibles.size
            var columnas = 1
            var mejor = 0f
            for (c in 1..min(n, 6)) {
                val filas = ceil(n / c.toDouble()).toInt()
                val lado = min(areaAncho / c, areaAlto / filas)
                if (lado > mejor + 0.5f) { mejor = lado; columnas = c }
            }
            val px = (min(max(mejor, 40f), 110f) * densidad).toInt()

            val filas = ceil(n / columnas.toDouble()).toInt()
            for (f in 0 until filas) {
                val fila = RemoteViews(ctx.packageName, R.layout.widget_fila)
                val enFila = visibles.subList(f * columnas, min((f + 1) * columnas, n))
                // La última fila, si queda incompleta, se centra con huecos a los lados.
                val faltan = columnas - enFila.size
                val huecos: (RemoteViews) -> Unit = { destino ->
                    for (i in 0 until faltan / 2) destino.addView(R.id.fila, RemoteViews(ctx.packageName, R.layout.widget_hueco))
                    if (faltan % 2 == 1) destino.addView(R.id.fila, RemoteViews(ctx.packageName, R.layout.widget_medio_hueco))
                }
                huecos(fila)
                for (h in enFila) {
                    val moneda = RemoteViews(ctx.packageName, R.layout.widget_moneda)
                    val c = Motor.cuenta(e.cuentas, h.id)
                    moneda.setImageViewBitmap(R.id.moneda, dibujarMoneda(h, c, px, noche))
                    moneda.setContentDescription(R.id.moneda, "${h.nombre}: $c de ${h.pasos}")
                    moneda.setOnClickPendingIntent(R.id.moneda, aviso(ctx, TOCAR, h.id))
                    fila.addView(R.id.fila, moneda)
                }
                huecos(fila)
                raiz.addView(R.id.filas, fila)
            }
            return raiz
        }

        private fun colorDe(hex: String): Int = try { Color.parseColor(hex) } catch (x: Exception) { 0xFF8E8E93.toInt() }

        private fun oscurecer(color: Int, factor: Float): Int =
            Color.rgb((Color.red(color) * factor).toInt(), (Color.green(color) * factor).toInt(), (Color.blue(color) * factor).toInt())

        /** La racha: una pastilla con un fueguito y los días seguidos al 100 %. Gris mientras hoy todavía no cuenta. */
        fun dibujarFuego(r: Racha, densidad: Float, noche: Boolean): Bitmap {
            val alto = 24f * densidad
            val llama = 0xFFFF8A1F.toInt()
            val emoji = Paint(Paint.ANTI_ALIAS_FLAG).apply { textSize = 13f * densidad }
            val numero = Paint(Paint.ANTI_ALIAS_FLAG).apply {
                textSize = 14f * densidad
                typeface = Typeface.create(Typeface.DEFAULT, Typeface.BOLD)
                color = if (r.encendida) llama else (if (noche) 0xFFA0A0AA.toInt() else 0xFF687082.toInt())
            }
            val texto = r.dias.toString()
            val margen = 8f * densidad
            val ancho = margen + emoji.measureText("🔥") + 2f * densidad + numero.measureText(texto) + margen
            val bmp = Bitmap.createBitmap(ceil(ancho).toInt(), ceil(alto).toInt(), Bitmap.Config.ARGB_8888)
            val lienzo = Canvas(bmp)
            val fondo = Paint(Paint.ANTI_ALIAS_FLAG).apply {
                color = if (r.encendida) (if (noche) 0x33FF8A1F else 0x26FF8A1F) else (if (noche) 0xE62A2A2E.toInt() else 0xE6E6E8EE.toInt())
            }
            lienzo.drawRoundRect(RectF(0f, 0f, ancho, alto), alto / 2f, alto / 2f, fondo)
            // Apagada, el fueguito se pinta en gris.
            if (!r.encendida) {
                val gris = android.graphics.ColorMatrix().apply { setSaturation(0f) }
                emoji.colorFilter = android.graphics.ColorMatrixColorFilter(gris)
                emoji.alpha = 200
            }
            val base = alto / 2f - (numero.descent() + numero.ascent()) / 2f
            lienzo.drawText("🔥", margen, alto / 2f - (emoji.descent() + emoji.ascent()) / 2f, emoji)
            lienzo.drawText(texto, margen + emoji.measureText("🔥") + 2f * densidad, base, numero)
            return bmp
        }

        /** Dibuja una moneda: fondo, líquido de color hasta donde va la cuenta, y el emoji encima. */
        fun dibujarMoneda(h: Habito, c: Int, px: Int, noche: Boolean): Bitmap {
            val bmp = Bitmap.createBitmap(px, px, Bitmap.Config.ARGB_8888)
            val lienzo = Canvas(bmp)
            val t = px.toFloat()
            val r = t / 2f
            val pintura = Paint(Paint.ANTI_ALIAS_FLAG)
            val pasada = Motor.excedido(h.tipo, h.pasos, c)
            val color = if (pasada) 0xFFFF5247.toInt() else colorDe(h.color)
            val v = Motor.valor(h.tipo, h.pasos, c).toFloat()

            val capa = lienzo.saveLayer(RectF(0f, 0f, t, t), null)
            pintura.color = if (noche) Color.BLACK else 0xFFE1E4EA.toInt()
            lienzo.drawRect(0f, 0f, t, t, pintura)
            if (v > 0f) {
                val y = t - t * v
                val ola = if (v >= 1f) 0f else t * 0.026f
                val camino = Path()
                camino.moveTo(0f, t)
                for (i in 0..28) {
                    val x = i / 28f
                    camino.lineTo(t * x, y - ola * sin(x * Math.PI * 4).toFloat())
                }
                camino.lineTo(t, t)
                camino.close()
                pintura.shader = LinearGradient(0f, y, 0f, t, color, oscurecer(color, 0.8f), Shader.TileMode.CLAMP)
                lienzo.drawPath(camino, pintura)
                pintura.shader = null
            }
            val texto = Paint(Paint.ANTI_ALIAS_FLAG)
            texto.textAlign = Paint.Align.CENTER
            texto.textSize = t * 0.44f
            lienzo.drawText(h.emoji, r, r - (texto.descent() + texto.ascent()) / 2f, texto)
            // Se recorta todo en forma de círculo con orilla suave.
            pintura.xfermode = PorterDuffXfermode(PorterDuff.Mode.DST_IN)
            pintura.color = Color.WHITE
            val mascara = Bitmap.createBitmap(px, px, Bitmap.Config.ALPHA_8)
            Canvas(mascara).drawCircle(r, r, r - 1f, Paint(Paint.ANTI_ALIAS_FLAG))
            lienzo.drawBitmap(mascara, 0f, 0f, pintura)
            pintura.xfermode = null
            lienzo.restoreToCount(capa)

            pintura.style = Paint.Style.STROKE
            pintura.strokeWidth = max(1f, t * 0.012f)
            pintura.color = if (noche) 0x1AFFFFFF else 0x10000000
            lienzo.drawCircle(r, r, r - 1f - pintura.strokeWidth / 2f, pintura)
            pintura.style = Paint.Style.FILL

            if (pasada) {
                val radio = t * 0.16f
                pintura.color = if (noche) 0xFFF4F4F6.toInt() else 0xFF10131A.toInt()
                lienzo.drawCircle(t - radio - 1f, radio + 1f, radio, pintura)
                texto.color = if (noche) 0xFF151517.toInt() else Color.WHITE
                texto.typeface = Typeface.DEFAULT_BOLD
                texto.textSize = t * 0.17f
                lienzo.drawText(c.toString(), t - radio - 1f, radio + 1f - (texto.descent() + texto.ascent()) / 2f, texto)
            }
            return bmp
        }
    }
}
