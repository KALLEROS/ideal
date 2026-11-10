# Ideal

Tu rutina del día en círculos que se llenan: agua, dientes, perro, cama y lo que tú elijas. Cada toque avanza un paso, cada día empieza de nuevo y queda un registro de cómo te fue. Funciona sin internet y todo se guarda solo en tu teléfono.

**App web:** https://kalleros.github.io/ideal/

**Instaladores (iPhone y Android):** https://github.com/KALLEROS/ideal/releases/tag/instaladores

| Pestaña | Para qué |
|---|---|
| **Hoy** | Tus círculos. Un toque avanza un paso; mantener presionado sirve para corregir. Arriba va el porcentaje del día. |
| **Registro** | Racha de días redondos, promedio, calendario del mes (cada día es una moneda) y cómo va cada círculo. |
| **Círculos** | Agregar, editar, ordenar y eliminar círculos. Aquí se elige el emoji, las veces al día y el color. |
| **Ajustes** | Hora de reinicio, apariencia, cómo poner el widget, respaldo y borrar todo. |

## Tres formas de usarla

Una página anclada a inicio **no puede tener widget**: el iPhone y Android solo se lo permiten a las apps instaladas. Por eso hay tres versiones con las mismas pantallas:

| Versión | Widget | Cómo se instala |
|---|---|---|
| **Web** | No | Abrir el link y anclar a inicio. |
| **App de iPhone** | Sí, con toques | Con AltStore y tu Apple ID, gratis. Se renueva cada 7 días. |
| **App de Android** | Sí, con toques | Descargar el archivo `Ideal.apk` y abrirlo. |

Cada versión guarda sus propios datos. Para pasar de una a otra: **Ajustes → Guardar un respaldo** en la primera y **Restaurar un respaldo** en la otra.

## Cómo cuenta

- **Meta**: algo que quieres cumplir. Cada toque llena una parte del círculo (el agua, por ejemplo, 8 toques).
- **Límite**: algo que quieres hacer menos, como el cigarro. Cada toque suma uno. El día cuenta como cumplido mientras no pases tu límite; si lo pasas, el círculo se pone rojo y muestra cuántos llevas.
- **Porcentaje del día**: el promedio de tus círculos. Una meta vale lo que llevas de ella; un límite vale completo mientras no lo pases.
- **Día redondo**: un día con todo cumplido. En el registro se pinta de oro; un día a medias, de plata.
- **Reinicio**: el día se reinicia a las 4:00 a. m. (se cambia en Ajustes). Lo que marques antes de esa hora cuenta para el día anterior. Los días en que no abras la app quedan en ceros en el registro.

## Instalar en el iPhone (con widget)

Necesitas un iPhone con **iOS 17 o más nuevo**, una PC con Windows y el cable del teléfono. Se hace una sola vez.

### 1. Preparar la PC

1. Instala **iTunes** e **iCloud** bajados directo de Apple, no los de la Microsoft Store:
   - iTunes: https://www.apple.com/itunes/download/win64
   - iCloud: el link está en la guía oficial de AltStore, https://faq.altstore.io/altstore-classic/how-to-install-altstore-windows
2. Baja **AltServer** desde https://altstore.io (el botón de Windows), descomprime y corre `Setup.exe`.
3. Busca "AltServer" en el menú de inicio y ábrelo **como administrador**. Queda un ícono junto al reloj.

### 2. Poner AltStore en el iPhone

1. Conecta el iPhone con el cable, desbloquéalo y toca **Confiar**.
2. Abre iTunes, entra con tu Apple ID y activa **Sincronizar con este iPhone por Wi-Fi**.
3. Clic en el ícono de AltServer junto al reloj → **Install AltStore** → elige tu iPhone.
4. Escribe tu Apple ID y contraseña. AltStore los manda solo a Apple; se usan para firmar la app a tu nombre.
5. En el iPhone: **Ajustes → General → VPN y gestión de dispositivos**, toca tu Apple ID y luego **Confiar**.
6. En el iPhone: **Ajustes → Privacidad y seguridad → Modo de desarrollador**, actívalo. El teléfono se reinicia.

### 3. Instalar Ideal

1. En el iPhone abre Safari y baja el archivo: https://github.com/KALLEROS/ideal/releases/download/instaladores/Ideal.ipa
2. Abre **AltStore**, ve a **My Apps**, toca **+** arriba a la izquierda y elige `Ideal.ipa`.
3. Si pregunta por las extensiones, elige **Keep App Extensions**. Es importante: la extensión es el widget.
4. Espera a que termine. Ideal aparece en tu pantalla de inicio.

### 4. Poner el widget

1. Abre Ideal una vez y elige tus círculos.
2. En la pantalla de inicio, mantén presionado un espacio vacío hasta que los íconos tiemblen.
3. Toca **Editar** arriba a la izquierda y luego **Agregar widget** (en iOS 17 es el botón **+**).
4. Busca **Ideal**, desliza hasta el tamaño grande y toca **Agregar widget**.

Cada toque en el widget avanza un círculo sin abrir la app. La flecha de arriba a la derecha deshace el último toque. Los círculos salen en el orden de la pestaña Círculos (hasta 20 en el grande, 10 en el mediano y 4 en el chico).

### Cada 7 días

Con un Apple ID gratuito, Apple deja usar la app 7 días y luego hay que renovarla. Tus datos no se pierden.

- **Sola**: si el iPhone y la PC están en el mismo Wi-Fi y AltServer está abierto, AltStore la renueva en segundo plano.
- **A mano**: abre AltStore → **My Apps** → **Refresh All**, con la PC prendida y AltServer abierto.

Si un día la app no abre, es que se venció: renuévala y vuelve a funcionar con todo tu registro.

Con una cuenta de desarrollador de Apple (99 USD al año) la app no se vence cada semana y se puede compartir por TestFlight. El proyecto ya está listo para eso.

## Instalar en Android (con widget)

1. En el teléfono baja el archivo: https://github.com/KALLEROS/ideal/releases/download/instaladores/Ideal.apk
2. Ábrelo. Si el teléfono pregunta, permite instalar apps desde el navegador.
3. Para el widget: mantén presionado un espacio vacío de la pantalla de inicio → **Widgets** → **Ideal** → arrástralo. Estíralo desde las orillas para hacerlo más grande.

## Usar la versión web

1. Abre https://kalleros.github.io/ideal/ en **Safari** (iPhone) o Chrome (Android).
2. iPhone: toca **Compartir** (cuadro con flecha) → **Agregar a inicio**. Android: menú → **Instalar app**.

Ya anclada, abre aunque no haya señal.

## Tus datos

- Viven solo en el teléfono. La app no tiene servidor, no pide cuenta y no manda nada a internet (la de Android ni siquiera tiene permiso de internet).
- **Guardar un respaldo** crea un archivo con tus círculos y tu registro, por si cambias de teléfono.
- **Borrar todo** pide tres confirmaciones seguidas; la última hay que escribirla. No se puede deshacer.

## Cómo funciona por dentro

| Carpeta o archivo | Qué hace |
|---|---|
| `web/` | La app: las pantallas que usan las tres versiones. |
| `web/motor.js` | Las reglas: toques, límites, reinicio del día, registro y porcentajes. |
| `web/datos.js` | Guarda en el teléfono (en el navegador, o le pide a la app de iPhone o Android que guarde). |
| `web/catalogo.js` | Los círculos sugeridos y los colores. |
| `web/emojis.js` | La galería de emojis con nombres en español. La genera `herramientas/emojis.mjs`. |
| `web/sw.js` | Guarda la app web para usarla sin señal. |
| `ios/` | La app de iPhone: `Ideal` muestra la carpeta `web`, `IdealWidget` es el widget y `Compartido` son las reglas y el dibujo de las monedas en Swift. |
| `android/` | La app de Android: muestra la carpeta `web` y trae su widget en Kotlin. |
| `pruebas/casos.json` | Casos que deben dar el mismo resultado en las tres versiones de las reglas (JavaScript, Swift y Kotlin). |
| `herramientas/servir.mjs` | Sirve la app en `http://localhost:5179` para probarla en la PC. |
| `herramientas/iconos.mjs` | Dibuja el ícono. |
| `herramientas/emojis.mjs` | Arma la galería de emojis con dos archivos de texto de Unicode, el organismo que define los emojis. |
| `.github/workflows/` | GitHub prueba y compila todo con cada cambio: publica la web y arma `Ideal.ipa` e `Ideal.apk`. |

Los emojis no son imágenes guardadas en la app: los dibuja el teléfono. En el iPhone son los de Apple y en Android los de Google, siempre nítidos a cualquier tamaño.

### Probar en la PC

```bash
node herramientas/servir.mjs
```

```bash
node --test pruebas/motor.test.mjs
```

Las apps de iPhone y Android las compila GitHub (pestaña **Actions**). Con cada compilación del iPhone se guardan fotos del widget en claro y oscuro, en el artefacto `fotos-iphone`.

### La llave de Android

Para que el teléfono acepte actualizar la app de Android sin desinstalarla, todas las versiones deben ir firmadas con la misma llave. El flujo `Android` la toma de dos secretos del repositorio: `IDEAL_LLAVES_B64` (el archivo de llaves en base64) e `IDEAL_LLAVES_CLAVE` (su contraseña). Si no existen, firma con una llave de pruebas que cambia en cada compilación.
