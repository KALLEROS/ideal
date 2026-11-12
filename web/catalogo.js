// Círculos sugeridos, colores y los emojis que más se usan en una rutina.
(function (raiz) {
  'use strict';

  // Colores con los que se llena un círculo. Se ven bien sobre negro (tema oscuro) y sobre gris claro.
  var COLORES = [
    { id: 'azul', hex: '#2F9BFF', nombre: 'Azul' },
    { id: 'turquesa', hex: '#1FC8D4', nombre: 'Turquesa' },
    { id: 'menta', hex: '#2ED3A0', nombre: 'Menta' },
    { id: 'verde', hex: '#55C843', nombre: 'Verde' },
    { id: 'amarillo', hex: '#F7C21B', nombre: 'Amarillo' },
    { id: 'naranja', hex: '#FF9431', nombre: 'Naranja' },
    { id: 'coral', hex: '#FF6257', nombre: 'Coral' },
    { id: 'rosa', hex: '#FF5FA2', nombre: 'Rosa' },
    { id: 'morado', hex: '#A66BFF', nombre: 'Morado' },
    { id: 'indigo', hex: '#5E7BFF', nombre: 'Índigo' },
    { id: 'arena', hex: '#C4915E', nombre: 'Arena' },
    { id: 'humo', hex: '#8E8E93', nombre: 'Humo' }
  ];
  var hex = {};
  COLORES.forEach(function (c) { hex[c.id] = c.hex; });

  function c(id, emoji, nombre, pasos, color, tipo, nota) {
    return { id: id, emoji: emoji, nombre: nombre, pasos: pasos, tipo: tipo || 'meta', color: hex[color], nota: nota || '' };
  }

  var GRUPOS = [
    { nombre: 'Comida', lista: [
      c('agua', '💧', 'Agua', 8, 'azul', 'meta', 'Un toque por vaso'),
      c('desayuno', '🍳', 'Desayuno', 1, 'amarillo'),
      c('comidas', '🥗', 'Comer bien', 3, 'verde', 'meta', 'Desayuno, comida y cena'),
      c('proteina', '🥩', 'Proteína', 3, 'coral'),
      c('fruta', '🍎', 'Fruta', 2, 'coral'),
      c('vitaminas', '💊', 'Vitaminas', 1, 'naranja')
    ] },
    { nombre: 'Cuerpo e higiene', lista: [
      c('dientes', '🪥', 'Dientes', 3, 'menta', 'meta', 'Mañana, tarde y noche'),
      c('bano', '🚿', 'Baño', 1, 'turquesa'),
      c('piel', '🧴', 'Piel', 2, 'rosa', 'meta', 'Mañana y noche'),
      c('hilo', '🦷', 'Hilo dental', 1, 'menta'),
      c('afeitar', '🪒', 'Afeitarme', 1, 'arena'),
      c('bloqueador', '☀️', 'Bloqueador', 1, 'amarillo')
    ] },
    { nombre: 'Casa', lista: [
      c('cama', '🛏️', 'Tender la cama', 1, 'indigo'),
      c('cuarto', '🧹', 'Recoger el cuarto', 1, 'arena'),
      c('trastes', '🍽️', 'Trastes', 1, 'turquesa'),
      c('ropa', '🧺', 'Ropa', 1, 'morado'),
      c('basura', '🗑️', 'Basura', 1, 'humo'),
      c('plantas', '🪴', 'Regar plantas', 1, 'verde')
    ] },
    { nombre: 'Mascotas', lista: [
      c('perro', '🐶', 'Perro', 3, 'naranja', 'meta', 'Comida, cena y paseo'),
      c('gato', '🐱', 'Gato', 2, 'amarillo', 'meta', 'Comida y arenero')
    ] },
    { nombre: 'Movimiento', lista: [
      c('caminar', '👟', 'Caminar o correr', 1, 'naranja'),
      c('ejercicio', '🏋️', 'Ejercicio', 1, 'coral'),
      c('estirar', '🤸', 'Estirar', 1, 'morado')
    ] },
    { nombre: 'Mente y descanso', lista: [
      c('leer', '📖', 'Leer', 1, 'indigo'),
      c('meditar', '🧘', 'Meditar', 1, 'morado'),
      c('dormir', '😴', 'Dormir 8 horas', 1, 'indigo'),
      c('escribir', '📓', 'Escribir', 1, 'arena')
    ] },
    { nombre: 'Malos hábitos', nota: 'Lo que quieres hacer menos. Cada toque suma uno y el día cuenta como cumplido mientras no pases tu límite. Con límite 0, cualquier toque lo pasa.', lista: [
      c('cigarro', '🚬', 'Cigarro', 5, 'humo', 'limite'),
      c('vape', '💨', 'Vape', 3, 'turquesa', 'limite'),
      c('mota', '🌿', 'Mota', 1, 'verde', 'limite'),
      c('cerveza', '🍺', 'Cerveza', 2, 'amarillo', 'limite'),
      c('whisky', '🥃', 'Whisky', 1, 'arena', 'limite'),
      c('vino', '🍷', 'Vino', 1, 'rosa', 'limite'),
      c('cocteles', '🍸', 'Tragos', 1, 'morado', 'limite'),
      c('cafe', '☕', 'Café', 3, 'arena', 'limite'),
      c('refresco', '🥤', 'Refresco', 1, 'coral', 'limite'),
      c('dulces', '🍬', 'Dulces', 1, 'rosa', 'limite'),
      c('chatarra', '🍔', 'Comida chatarra', 1, 'naranja', 'limite'),
      c('celular', '📱', 'Redes sociales', 2, 'indigo', 'limite', 'Un toque por hora'),
      c('apuestas', '🎰', 'Apuestas', 0, 'coral', 'limite'),
      c('desvelo', '🦉', 'Desvelarme', 0, 'indigo', 'limite')
    ] }
  ];

  // Con estos empieza marcada la primera pantalla.
  var INICIALES = ['agua', 'dientes', 'bano', 'cama'];

  // Lo primero que aparece en la galería de emojis.
  var RUTINA = ('💧 🪥 🚿 🛁 🧼 🧴 🪒 🦷 💊 🩹 🛏️ 🧹 🧺 🧽 🪣 🗑️ 🍽️ 🍳 🥚 🥩 🍗 🐟 🥗 🥦 🍎 🍌 🥛 ☕ 🍵 🥤 🍬 🍫 ' +
    '🚬 💨 🌿 🍃 🍺 🍻 🥃 🍷 🍸 🍹 🍾 🍔 🍟 🍕 🌭 🍩 🎰 🎲 🃏 📱 🎮 🦉 💸 ' +
    '🐶 🐕 🐱 🐈 🐠 🐦 🪴 🌱 👟 🏃 🚶 🏋️ 🚴 🧘 🤸 🏊 ⚽ 🏀 🥊 📖 📚 ✍️ 📓 🧠 🙏 😴 ⏰ 📵 💻 💼 💰 🧾 📞 ❤️ 👨‍👩‍👧 🎸 🎧 🎨 🧩 ☀️ 🌙 🚗 🛒 🧊 👕 💇 💅 🕶️ 🎒').split(' ');

  raiz.IdealCatalogo = { COLORES: COLORES, GRUPOS: GRUPOS, INICIALES: INICIALES, RUTINA: RUTINA };
})(window);
