// Comprueba que el motor en Kotlin dé los mismos resultados que el de la web, con los casos de pruebas/casos.json.
package com.kalleros.ideal

import org.json.JSONArray
import org.json.JSONObject
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test
import java.io.File
import java.util.Calendar
import java.util.GregorianCalendar

class MotorTest {
    private val datos: JSONObject by lazy {
        val archivo = listOf("../../pruebas/casos.json", "../pruebas/casos.json", "pruebas/casos.json").map { File(it) }.first { it.exists() }
        JSONObject(archivo.readText(Charsets.UTF_8))
    }

    /** Texto ordenado de un dato JSON, para comparar sin importar el orden de las llaves. */
    private fun ordenado(x: Any?): String = when (x) {
        null, JSONObject.NULL -> "null"
        is JSONObject -> x.keys().asSequence().toList().sorted().joinToString(",", "{", "}") { "\"" + it + "\":" + ordenado(x.get(it)) }
        is JSONArray -> (0 until x.length()).joinToString(",", "[", "]") { ordenado(x.get(it)) }
        is String -> "\"" + x + "\""
        else -> x.toString()
    }

    private fun texto(o: JSONObject, llave: String): String? = if (o.isNull(llave)) null else o.get(llave).toString()

    @Test
    fun claveDia() {
        val claves = datos.getJSONArray("claves")
        for (i in 0 until claves.length()) {
            val c = claves.getJSONObject(i)
            val momento = GregorianCalendar(c.getInt("y"), c.getInt("m") - 1, c.getInt("d"), c.getInt("h"), 30)
            assertEquals(c.toString(), c.getString("espera"), Motor.claveDia(momento, c.getInt("reinicio")))
        }
    }

    @Test
    fun casosCompartidos() {
        val casos = datos.getJSONArray("casos")
        assertTrue(casos.length() > 0)
        for (i in 0 until casos.length()) {
            val caso = casos.getJSONObject(i)
            val nombre = caso.getString("nombre")
            val config = datos.getJSONObject("configs").getJSONObject(caso.getString("config")).toString()
            val e = Motor.interpretar(config, texto(caso, "hoy"), caso.getJSONObject("historial").toString())
            val pasos = caso.getJSONArray("pasos")
            for (j in 0 until pasos.length()) {
                val p = pasos.getJSONObject(j)
                when (p.getString("op")) {
                    "dia" -> assertEquals(nombre, p.getBoolean("cambia"), Motor.ponerAlDia(e, p.getString("dia")))
                    "tocar" -> assertEquals(nombre, p.getBoolean("cambia"), Motor.tocar(e, p.getString("id")))
                    "deshacer" -> assertEquals(nombre, texto(p, "da"), Motor.deshacer(e))
                    else -> throw AssertionError("Paso desconocido: " + p.getString("op"))
                }
            }
            val espera = caso.getJSONObject("espera")
            assertEquals(nombre, ordenado(espera.getJSONObject("hoy")), ordenado(JSONObject(Motor.textoHoy(e))))
            assertEquals(nombre, ordenado(espera.getJSONObject("historial")), ordenado(e.historial))
            assertEquals(nombre, if (espera.isNull("puntaje")) null else espera.getInt("puntaje"), Motor.puntaje(e))
            assertEquals(nombre, espera.getBoolean("redondo"), Motor.redondo(e))
        }
    }

    @Test
    fun siguienteReinicio() {
        val antes = GregorianCalendar(2026, 10, 10, 2, 15)
        val r = Motor.siguienteReinicio(antes, 4)
        assertEquals(10, r.get(Calendar.DAY_OF_MONTH))
        assertEquals(4, r.get(Calendar.HOUR_OF_DAY))
        val justo = GregorianCalendar(2026, 10, 10, 4, 0)
        assertEquals(11, Motor.siguienteReinicio(justo, 4).get(Calendar.DAY_OF_MONTH))
    }
}
