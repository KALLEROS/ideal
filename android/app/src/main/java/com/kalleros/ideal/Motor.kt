// Las reglas de los círculos, iguales a las de web/motor.js.
// pruebas/casos.json comprueba que esta versión y la de la web den el mismo resultado.
package com.kalleros.ideal

import org.json.JSONArray
import org.json.JSONObject
import java.util.Calendar
import java.util.GregorianCalendar
import java.util.Locale
import kotlin.math.floor
import kotlin.math.min

data class Habito(
    val id: String,
    val emoji: String,
    val nombre: String,
    val pasos: Int,
    val tipo: String,
    val color: String
) {
    val esLimite: Boolean get() = tipo == "limite"
}

/** Todo lo guardado: los círculos, lo que llevas hoy y el registro de días pasados. */
class Estado(
    var habitos: List<Habito> = emptyList(),
    var horaReinicio: Int = 4,
    var dia: String? = null,
    var cuentas: MutableMap<String, Int> = LinkedHashMap(),
    var toques: MutableList<String> = ArrayList(),
    var historial: JSONObject = JSONObject()
)

object Motor {
    const val MAX_CUENTA = 99
    const val MAX_TOQUES = 400
    const val MAX_HUECO = 400

    // ---------- Fechas ----------
    private fun clave(c: Calendar): String =
        String.format(Locale.ROOT, "%d-%02d-%02d", c.get(Calendar.YEAR), c.get(Calendar.MONTH) + 1, c.get(Calendar.DAY_OF_MONTH))

    /** Día al que pertenece un momento. Antes de la hora de reinicio todavía cuenta como el día anterior. */
    fun claveDia(momento: Calendar, horaReinicio: Int): String {
        val f = GregorianCalendar(momento.get(Calendar.YEAR), momento.get(Calendar.MONTH), momento.get(Calendar.DAY_OF_MONTH), 12, 0)
        if (momento.get(Calendar.HOUR_OF_DAY) < horaReinicio) f.add(Calendar.DAY_OF_MONTH, -1)
        return clave(f)
    }

    fun sumarDias(clave: String, n: Int): String {
        val p = clave.split("-").mapNotNull { it.toIntOrNull() }
        if (p.size != 3) return clave
        val f = GregorianCalendar(p[0], p[1] - 1, p[2], 12, 0)
        f.add(Calendar.DAY_OF_MONTH, n)
        return clave(f)
    }

    fun siguienteReinicio(momento: Calendar, horaReinicio: Int): Calendar {
        val f = momento.clone() as Calendar
        f.set(Calendar.HOUR_OF_DAY, horaReinicio)
        f.set(Calendar.MINUTE, 0)
        f.set(Calendar.SECOND, 0)
        f.set(Calendar.MILLISECOND, 0)
        if (!f.after(momento)) f.add(Calendar.DAY_OF_MONTH, 1)
        return f
    }

    // ---------- Cuentas ----------
    fun cuenta(cuentas: Map<String, Int>?, id: String): Int {
        val c = cuentas?.get(id) ?: 0
        return if (c > 0) min(c, MAX_CUENTA) else 0
    }

    /** Cuánto del círculo se pinta (0 a 1). */
    fun valor(tipo: String, pasos: Int, c: Int): Double {
        if (tipo == "limite") return if (pasos <= 0) (if (c > 0) 1.0 else 0.0) else min(c.toDouble() / pasos, 1.0)
        return if (pasos <= 0) 0.0 else min(c, pasos).toDouble() / pasos
    }

    /** Cuánto cuenta para el día (0 a 1). Una meta vale lo que llevas; un límite vale completo mientras no lo pases. */
    fun cumplimiento(tipo: String, pasos: Int, c: Int): Double {
        if (tipo == "limite") return if (c <= pasos) 1.0 else pasos.toDouble() / c
        return if (pasos <= 0) 0.0 else min(c, pasos).toDouble() / pasos
    }

    fun excedido(tipo: String, pasos: Int, c: Int): Boolean = tipo == "limite" && c > pasos

    /** Porcentaje de hoy. Sin círculos no hay porcentaje. */
    fun puntaje(e: Estado): Int? {
        if (e.habitos.isEmpty()) return null
        var s = 0.0
        for (h in e.habitos) s += cumplimiento(h.tipo, h.pasos, cuenta(e.cuentas, h.id))
        return floor(s / e.habitos.size * 100 + 0.5).toInt()
    }

    /** Día redondo: todo cumplido. */
    fun redondo(e: Estado): Boolean =
        e.habitos.isNotEmpty() && e.habitos.all { cumplimiento(it.tipo, it.pasos, cuenta(e.cuentas, it.id)) >= 1.0 }

    // ---------- El día ----------
    private fun foto(e: Estado, cuentas: Map<String, Int>?): JSONObject {
        val lista = JSONArray()
        for (h in e.habitos) {
            lista.put(JSONObject().put("id", h.id).put("e", h.emoji).put("n", h.nombre).put("p", h.pasos).put("c", cuenta(cuentas, h.id)).put("t", h.tipo))
        }
        return JSONObject().put("h", lista)
    }

    private fun hoyNuevo(e: Estado, dia: String) {
        e.dia = dia
        e.cuentas = LinkedHashMap()
        e.toques = ArrayList()
    }

    /** Si ya cambió el día: guarda el anterior en el registro y deja el de hoy en ceros. */
    fun ponerAlDia(e: Estado, dia: String): Boolean {
        val anterior = e.dia
        if (anterior.isNullOrEmpty()) { hoyNuevo(e, dia); return true }
        if (dia <= anterior) return false
        if (e.habitos.isNotEmpty()) {
            e.historial.put(anterior, foto(e, e.cuentas))
            var d = sumarDias(anterior, 1)
            var n = 0
            while (d < dia && n < MAX_HUECO) {
                e.historial.put(d, foto(e, null))
                d = sumarDias(d, 1)
                n++
            }
        }
        hoyNuevo(e, dia)
        return true
    }

    // ---------- Toques ----------
    /** Un toque avanza un paso. Una meta ya completa no avanza más; un límite sigue contando. */
    fun tocar(e: Estado, id: String): Boolean {
        if (e.dia == null) return false
        val h = e.habitos.firstOrNull { it.id == id } ?: return false
        val c = cuenta(e.cuentas, id)
        val tope = if (h.esLimite) MAX_CUENTA else h.pasos
        if (c >= tope) return false
        e.cuentas[id] = c + 1
        e.toques.add(id)
        while (e.toques.size > MAX_TOQUES) e.toques.removeAt(0)
        return true
    }

    /** Deshace el último toque del día. Devuelve el id del círculo, o null si no había nada que deshacer. */
    fun deshacer(e: Estado): String? {
        while (e.toques.isNotEmpty()) {
            val id = e.toques.removeAt(e.toques.size - 1)
            val c = cuenta(e.cuentas, id)
            if (c > 0 && e.habitos.any { it.id == id }) {
                if (c - 1 > 0) e.cuentas[id] = c - 1 else e.cuentas.remove(id)
                return id
            }
        }
        return null
    }

    // ---------- De texto a datos y de regreso (el mismo formato que usa la app web) ----------
    fun interpretar(config: String?, hoy: String?, historial: String?): Estado {
        val e = Estado()
        objeto(config)?.let { c ->
            e.horaReinicio = c.optInt("horaReinicio", 4)
            val lista = c.optJSONArray("habitos")
            val habitos = ArrayList<Habito>()
            if (lista != null) for (i in 0 until lista.length()) {
                val o = lista.optJSONObject(i) ?: continue
                val id = o.optString("id", "")
                if (id.isEmpty()) continue
                habitos.add(Habito(id, o.optString("emoji", "⭐"), o.optString("nombre", ""), o.optInt("pasos", 1), o.optString("tipo", "meta"), o.optString("color", "#8E8E93")))
            }
            e.habitos = habitos
        }
        objeto(hoy)?.let { h ->
            val dia = h.optString("dia", "")
            if (dia.isNotEmpty()) {
                e.dia = dia
                h.optJSONObject("cuentas")?.let { cs -> for (k in cs.keys()) e.cuentas[k] = cs.optInt(k, 0) }
                h.optJSONArray("toques")?.let { ts -> for (i in 0 until ts.length()) e.toques.add(ts.optString(i)) }
            }
        }
        objeto(historial)?.let { e.historial = it }
        return e
    }

    fun textoHoy(e: Estado): String {
        val cuentas = JSONObject()
        for ((k, v) in e.cuentas) cuentas.put(k, v)
        return JSONObject().put("dia", e.dia ?: "").put("cuentas", cuentas).put("toques", JSONArray(e.toques)).toString()
    }

    private fun objeto(texto: String?): JSONObject? {
        if (texto.isNullOrEmpty()) return null
        return try { JSONObject(texto) } catch (x: Exception) { null }
    }
}
