// Guarda los tres documentos de Ideal (config, hoy, historial) en los archivos privados de la app.
// Los leen la app y el widget. Nada sale del teléfono.
package com.kalleros.ideal

import android.content.Context
import java.io.File
import java.util.Calendar

object Almacen {
    private val CLAVES = setOf("config", "hoy", "historial")

    private fun archivo(ctx: Context, clave: String): File? =
        if (clave in CLAVES) File(ctx.filesDir, "$clave.json") else null

    @Synchronized
    fun leerTexto(ctx: Context, clave: String): String? {
        val f = archivo(ctx, clave) ?: return null
        return try { if (f.exists()) f.readText(Charsets.UTF_8) else null } catch (x: Exception) { null }
    }

    @Synchronized
    fun guardarTexto(ctx: Context, clave: String, texto: String) {
        val f = archivo(ctx, clave) ?: return
        try {
            // Se escribe aparte y luego se cambia de nombre, para no dejar un archivo a medias.
            val temporal = File(ctx.filesDir, "$clave.json.tmp")
            temporal.writeText(texto, Charsets.UTF_8)
            if (!temporal.renameTo(f)) { f.writeText(texto, Charsets.UTF_8); temporal.delete() }
        } catch (x: Exception) { /* sin espacio: se intentará en el siguiente guardado */ }
    }

    @Synchronized
    fun borrarTodo(ctx: Context) {
        for (clave in CLAVES) archivo(ctx, clave)?.delete()
    }

    /** Lee lo guardado y, si ya cambió el día, pasa el anterior al registro y deja hoy en ceros. */
    @Synchronized
    fun estadoAlDia(ctx: Context, ahora: Calendar = Calendar.getInstance()): Estado {
        val e = Motor.interpretar(leerTexto(ctx, "config"), leerTexto(ctx, "hoy"), leerTexto(ctx, "historial"))
        if (Motor.ponerAlDia(e, Motor.claveDia(ahora, e.horaReinicio))) {
            guardarTexto(ctx, "historial", e.historial.toString())
            guardarHoy(ctx, e)
        }
        return e
    }

    @Synchronized
    fun guardarHoy(ctx: Context, e: Estado) = guardarTexto(ctx, "hoy", Motor.textoHoy(e))
}
