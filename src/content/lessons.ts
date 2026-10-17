// Contenido educativo de Dokapp. Divulgativo y orientativo: no sustituye
// el consejo de profesionales sanitarios.

import type { PillarId } from '../domain/types';

export type Question =
  | { kind: 'choice'; prompt: string; options: string[]; answer: number; explain: string }
  | { kind: 'truefalse'; prompt: string; answer: boolean; explain: string };

export type ToolId = 'breathing' | 'timer' | 'gratitude' | 'senses';

export interface Lesson {
  id: string;
  pillar: PillarId;
  level: number;
  title: string;
  minutes: number;
  cards: { title: string; text: string }[];
  quiz: Question[];
  reflection: string;
  challenge: string;
  tool?: ToolId;
}

type Raw = Omit<Lesson, 'id' | 'pillar' | 'level'>;

const tf = (prompt: string, answer: boolean, explain: string): Question => ({ kind: 'truefalse', prompt, answer, explain });
const ch = (prompt: string, options: string[], answer: number, explain: string): Question => ({ kind: 'choice', prompt, options, answer, explain });

const RAW: Record<PillarId, Raw[]> = {
  mental: [
    {
      title: '¿Qué es el bienestar mental?', minutes: 3,
      cards: [
        { title: 'Más que no estar mal', text: 'La OMS describe la salud mental como un estado de bienestar que permite afrontar las tensiones de la vida, desarrollar tus capacidades, aprender, trabajar y aportar a tu comunidad. No es solo la ausencia de un trastorno.' },
        { title: 'Un continuo', text: 'Todos nos movemos a lo largo de un espectro: hay días de más energía y días más difíciles. Cuidarse no consiste en estar siempre bien, sino en tener recursos para volver al equilibrio.' },
        { title: 'Pequeños hábitos', text: 'El descanso, el movimiento, las relaciones y el sentido de propósito influyen en cómo nos sentimos. Por eso en Dokapp los siete pilares están conectados.' },
      ],
      quiz: [
        tf('Tener salud mental significa no sentir nunca tristeza ni estrés.', false, 'Las emociones difíciles forman parte de la vida. La salud mental tiene que ver con cómo las atravesamos.'),
        ch('¿Cuál de estos hábitos influye en el bienestar mental?', ['Dormir bien', 'Moverse a diario', 'Mantener relaciones cercanas', 'Todos ellos'], 3, 'Mente, cuerpo y relaciones se influyen mutuamente.'),
      ],
      reflection: '¿Qué tres cosas te ayudan a recuperar el equilibrio en un día difícil?',
      challenge: 'Hoy, registra una acción que hagas solo porque te sienta bien.',
    },
    {
      title: 'Identificar el estrés', minutes: 3,
      cards: [
        { title: 'Una respuesta útil', text: 'El estrés es la respuesta del cuerpo ante una exigencia: se acelera el corazón y aumenta la atención. A corto plazo nos ayuda a actuar.' },
        { title: 'Cuando se alarga', text: 'Si se mantiene durante semanas puede aparecer cansancio, irritabilidad, problemas de sueño, tensión muscular o dificultad para concentrarse.' },
        { title: 'Ponerle nombre', text: 'Detectar tus señales personales (mandíbula apretada, pensamientos acelerados, comer sin hambre…) es el primer paso para regularlo.' },
      ],
      quiz: [
        tf('El estrés puntual puede ser útil porque nos prepara para actuar.', true, 'El problema aparece cuando se vuelve crónico y no hay recuperación.'),
        ch('¿Cuál puede ser una señal de estrés prolongado?', ['Dormir peor', 'Más irritabilidad', 'Tensión muscular', 'Cualquiera de ellas'], 3, 'El estrés se expresa en el cuerpo, las emociones y la conducta.'),
      ],
      reflection: '¿Cuál es la primera señal que te avisa de que estás estresado o estresada?',
      challenge: 'Cuando notes tu señal de estrés hoy, para 60 segundos y respira despacio.',
    },
    {
      title: 'La importancia del descanso', minutes: 4,
      cards: [
        { title: 'Dormir es activo', text: 'Mientras duermes el cerebro consolida recuerdos y regula las emociones. La mayoría de personas adultas necesita entre 7 y 9 horas.' },
        { title: 'Regularidad', text: 'Acostarte y levantarte a horas parecidas, también el fin de semana, ayuda a tu reloj interno más que dormir mucho un día concreto.' },
        { title: 'Higiene del sueño', text: 'Luz natural por la mañana, cenas ligeras, poca cafeína por la tarde y un dormitorio oscuro y fresco facilitan el sueño.' },
      ],
      quiz: [
        ch('¿Cuántas horas de sueño necesita, en general, una persona adulta?', ['4–5 horas', '5–6 horas', '7–9 horas', '10–12 horas'], 2, 'Es la recomendación habitual para adultos; hay variación individual.'),
        tf('Recuperar sueño el fin de semana compensa por completo una semana durmiendo poco.', false, 'Ayuda algo, pero la regularidad es más beneficiosa.'),
      ],
      reflection: '¿Qué podrías cambiar esta semana en la hora antes de dormir?',
      challenge: 'Esta noche, deja el móvil fuera del alcance 30 minutos antes de dormir.',
    },
    {
      title: 'Respiración para calmarte', minutes: 4, tool: 'breathing',
      cards: [
        { title: 'Tu freno natural', text: 'Exhalar de forma lenta y prolongada activa el sistema nervioso parasimpático, el encargado de la calma y la recuperación.' },
        { title: 'Respiración cuadrada', text: 'Inhala en 4 tiempos, mantén 4, exhala en 4 y mantén 4. Repite varias rondas. Es fácil de recordar y puedes hacerla en cualquier lugar.' },
        { title: 'Sin forzar', text: 'Si te mareas o te incomoda retener el aire, acorta las pausas o simplemente alarga la exhalación.' },
      ],
      quiz: [
        tf('Alargar la exhalación ayuda a que el cuerpo se calme.', true, 'La exhalación lenta favorece la respuesta de relajación.'),
        ch('En la respiración cuadrada, ¿cuántas fases hay?', ['2', '3', '4', '6'], 2, 'Inhalar, retener, exhalar y retener.'),
      ],
      reflection: '¿Cómo notas tu cuerpo después de respirar despacio un minuto?',
      challenge: 'Practica la respiración cuadrada durante tres rondas antes de una tarea que te inquiete.',
    },
    {
      title: 'Reflexionar sobre tus pensamientos', minutes: 4,
      cards: [
        { title: 'Pensamientos no son hechos', text: 'La mente produce interpretaciones automáticas. «Lo he hecho fatal» es un pensamiento, no necesariamente la realidad.' },
        { title: 'Trampas habituales', text: 'Pensar en blanco o negro, adivinar lo que otros piensan o anticipar catástrofes son sesgos frecuentes en todas las personas.' },
        { title: 'Tres preguntas', text: '¿Qué pruebas tengo? ¿Qué le diría a un amigo que pensara esto? ¿Hay otra explicación posible?' },
      ],
      quiz: [
        tf('Todo lo que pensamos sobre nosotros mismos es objetivo.', false, 'Los pensamientos automáticos suelen estar sesgados, sobre todo con estrés o cansancio.'),
        ch('¿Qué pregunta ayuda a cuestionar un pensamiento negativo?', ['¿Por qué siempre me pasa a mí?', '¿Qué le diría a un amigo?', '¿Quién tiene la culpa?', 'Ninguna'], 1, 'Tratarte como tratarías a alguien querido abre otras perspectivas.'),
      ],
      reflection: 'Escribe un pensamiento que se repita a menudo y una alternativa más amable y realista.',
      challenge: 'Hoy, cuando aparezca un pensamiento duro contigo, reformúlalo por escrito.',
    },
    {
      title: 'Crear una rutina de autocuidado', minutes: 3,
      cards: [
        { title: 'Lo que te recarga', text: 'El autocuidado no es un lujo: son las acciones que te devuelven energía. Para unas personas es leer; para otras, caminar o cocinar.' },
        { title: 'Pequeño y concreto', text: '«Cuidarme más» es difícil de cumplir. «Diez minutos de estiramientos al despertar» es concreto y alcanzable.' },
        { title: 'Ancla tus hábitos', text: 'Vincula el nuevo hábito a algo que ya haces: después del café, después de lavarte los dientes…' },
      ],
      quiz: [
        ch('¿Qué objetivo es más fácil de mantener?', ['Ser más feliz', 'Cuidarme mucho', 'Leer 10 minutos después de cenar', 'Cambiar mi vida'], 2, 'Los objetivos concretos y pequeños se cumplen más.'),
        tf('El autocuidado es igual para todas las personas.', false, 'Cada persona se recarga de forma distinta.'),
      ],
      reflection: 'Diseña tu rutina mínima de autocuidado: ¿qué, cuándo y después de qué?',
      challenge: 'Crea un objetivo en tu perfil con tu nueva rutina.',
    },
    {
      title: 'Reto de siete días', minutes: 2,
      cards: [
        { title: 'Integrar lo aprendido', text: 'Durante siete días, elige cada día una de las prácticas del camino: descanso, respiración, revisar pensamientos o autocuidado.' },
        { title: 'Sin perfeccionismo', text: 'Si un día no puedes, no pasa nada. Lo importante es retomar al día siguiente. Puedes marcar días de descanso en tu calendario.' },
      ],
      quiz: [tf('Si fallas un día, el reto ya no tiene sentido.', false, 'La constancia se construye retomando, no siendo perfecto.')],
      reflection: '¿Qué práctica de este camino quieres mantener después del reto?',
      challenge: 'Registra una acción de salud mental cada día durante siete días.',
    },
  ],
  ecologia: [
    {
      title: 'Pertenecer a la naturaleza', minutes: 3,
      cards: [
        { title: 'Somos parte', text: 'La pertenencia ecológica es sentir que formas parte de la naturaleza, no que la observas desde fuera. Esa conexión se asocia con más bienestar y más conductas sostenibles.' },
        { title: 'Empieza cerca', text: 'No hace falta ir a la montaña: un árbol de tu calle, un parque o las plantas de tu balcón también son naturaleza.' },
      ],
      quiz: [
        tf('Para conectar con la naturaleza hay que viajar lejos de la ciudad.', false, 'La naturaleza cercana cuenta, y mucho.'),
        ch('Sentirse parte de la naturaleza se relaciona con…', ['Más bienestar', 'Más conductas sostenibles', 'Ambas', 'Ninguna'], 2, 'Diversos estudios encuentran ambas relaciones.'),
      ],
      reflection: '¿Cuál es el rincón natural más cercano a tu casa? ¿Cuándo fue la última vez que fuiste?',
      challenge: 'Fotografía hoy un elemento natural de tu barrio.',
    },
    {
      title: 'El poder de un paseo verde', minutes: 3,
      cards: [
        { title: 'Dosis de naturaleza', text: 'Algunas investigaciones sugieren que pasar alrededor de dos horas a la semana en espacios naturales se asocia con mejor salud y bienestar percibidos.' },
        { title: 'Atención suave', text: 'Los entornos naturales captan la atención de forma amable (hojas, agua, nubes) y permiten descansar a la atención dirigida que usamos al trabajar.' },
      ],
      quiz: [
        ch('¿Cuánto tiempo semanal en la naturaleza se ha asociado con mejor bienestar en algunos estudios?', ['10 minutos', 'Unas 2 horas', '10 horas', '24 horas'], 1, 'Unas dos horas, repartidas como quieras.'),
        tf('Puedes repartir ese tiempo en varios paseos cortos.', true, 'Lo que importa es el total semanal.'),
      ],
      reflection: '¿Qué notas en tu cuerpo y en tu ánimo después de un paseo al aire libre?',
      challenge: 'Da un paseo de 20 minutos por un espacio verde sin auriculares.',
    },
    {
      title: 'Consumo consciente', minutes: 4,
      cards: [
        { title: 'Las tres erres', text: 'Reducir, reutilizar y reciclar, en ese orden. El residuo que menos contamina es el que no se genera.' },
        { title: 'Preguntas antes de comprar', text: '¿Lo necesito? ¿Puedo pedirlo prestado, repararlo o comprarlo de segunda mano?' },
      ],
      quiz: [
        ch('¿Cuál es la erre más eficaz?', ['Reciclar', 'Reutilizar', 'Reducir', 'Todas igual'], 2, 'Reducir evita el impacto desde el origen.'),
        tf('Reparar un objeto es una forma de reducir residuos.', true, 'Alarga su vida útil y evita fabricar otro.'),
      ],
      reflection: '¿Qué objeto de un solo uso podrías sustituir esta semana?',
      challenge: 'Lleva hoy tu propia bolsa, botella o táper.',
    },
    {
      title: 'Observar con los cinco sentidos', minutes: 3, tool: 'senses',
      cards: [
        { title: 'Ejercicio 5-4-3-2-1', text: 'Al aire libre, nombra 5 cosas que ves, 4 que puedes tocar, 3 que oyes, 2 que hueles y 1 que saboreas o agradeces.' },
        { title: 'Presencia', text: 'Es una forma sencilla de anclar la atención en el presente y descubrir detalles que normalmente pasan desapercibidos.' },
      ],
      quiz: [tf('El ejercicio 5-4-3-2-1 sirve para anclar la atención al presente.', true, 'Usa los sentidos como ancla.')],
      reflection: '¿Qué detalle descubriste hoy que no habías visto antes?',
      challenge: 'Haz el ejercicio 5-4-3-2-1 en un parque o en tu ventana.',
    },
    {
      title: 'Movilidad sostenible', minutes: 3,
      cards: [
        { title: 'Doble beneficio', text: 'Caminar o ir en bici en trayectos cortos reduce emisiones y suma actividad física a tu día.' },
        { title: 'Empieza por uno', text: 'No hace falta cambiarlo todo: elige un trayecto semanal que puedas hacer a pie, en bici o en transporte público.' },
      ],
      quiz: [ch('¿Qué opción combina salud y sostenibilidad?', ['Coche para 500 m', 'Ir andando', 'Moto', 'Taxi'], 1, 'Caminar no emite y te mueve.')],
      reflection: '¿Qué trayecto habitual podrías hacer de forma más sostenible?',
      challenge: 'Haz un trayecto de hoy caminando o en bici.',
    },
    {
      title: 'Cuidar lo vivo', minutes: 3,
      cards: [
        { title: 'Plantas y huertos', text: 'Cuidar plantas o participar en un huerto urbano conecta con los ciclos naturales y con la comunidad.' },
        { title: 'Biodiversidad cercana', text: 'Plantas autóctonas en balcones y jardines ofrecen alimento y refugio a polinizadores.' },
      ],
      quiz: [tf('Las plantas autóctonas pueden favorecer a los polinizadores locales.', true, 'Están adaptadas al ecosistema de tu zona.')],
      reflection: '¿Qué ser vivo podrías cuidar de forma regular?',
      challenge: 'Riega, planta o cuida algo vivo hoy y regístralo.',
    },
    {
      title: 'Reto de siete días', minutes: 2,
      cards: [{ title: 'Una semana verde', text: 'Cada día, una acción: paseo, consumo consciente, movilidad, observación o cuidado de algo vivo.' }],
      quiz: [tf('Las acciones pequeñas y repetidas también generan impacto.', true, 'Sumadas en el tiempo y entre muchas personas, cuentan.')],
      reflection: '¿Qué hábito ecológico quieres quedarte?',
      challenge: 'Registra una acción de pertenencia ecológica cada día durante siete días.',
    },
  ],
  emocional: [
    {
      title: 'Qué es la inteligencia emocional', minutes: 3,
      cards: [
        { title: 'Cuatro habilidades', text: 'Percibir emociones, comprenderlas, usarlas para pensar y regularlas. Se pueden entrenar a cualquier edad.' },
        { title: 'Ninguna emoción es mala', text: 'Todas aportan información: el miedo protege, la tristeza pide pausa, el enfado señala un límite.' },
      ],
      quiz: [
        tf('La inteligencia emocional es algo con lo que se nace y no cambia.', false, 'Son habilidades que se entrenan con práctica.'),
        ch('¿Qué suele señalar el enfado?', ['Que algo es injusto o se ha cruzado un límite', 'Nada útil', 'Hambre siempre', 'Alegría'], 0, 'Escuchar el enfado ayuda a poner límites sanos.'),
      ],
      reflection: '¿Qué emoción te cuesta más aceptar en ti?',
      challenge: 'Hoy, nombra en voz alta o por escrito tres emociones que hayas sentido.',
    },
    {
      title: 'Ponle nombre a lo que sientes', minutes: 3,
      cards: [
        { title: 'Vocabulario emocional', text: 'Pasar de «estoy mal» a «estoy frustrado» o «me siento solo» ayuda a entender qué necesitas.' },
        { title: 'Nombrar regula', text: 'Etiquetar una emoción con palabras puede reducir su intensidad. Es una de las razones por las que Dokapp te pregunta cómo te sientes.' },
      ],
      quiz: [tf('Nombrar una emoción puede ayudar a reducir su intensidad.', true, 'Poner palabras ayuda a regular.')],
      reflection: 'Describe cómo te sientes ahora con la palabra más precisa que encuentres.',
      challenge: 'Registra hoy una acción y elige con cuidado su emoción.',
    },
    {
      title: 'Escucha activa', minutes: 4,
      cards: [
        { title: 'Escuchar para entender', text: 'A menudo escuchamos para responder. La escucha activa busca comprender: mirar, no interrumpir y preguntar.' },
        { title: 'Parafrasear', text: '«Si te he entendido bien, lo que te preocupa es…» muestra interés y evita malentendidos.' },
      ],
      quiz: [ch('¿Qué es parafrasear?', ['Dar un consejo rápido', 'Repetir con tus palabras lo que has entendido', 'Cambiar de tema', 'Contar tu experiencia'], 1, 'Confirma que has entendido.')],
      reflection: '¿Con quién te gustaría practicar una escucha más atenta?',
      challenge: 'En tu próxima conversación, parafrasea al menos una vez.',
    },
    {
      title: 'Empatía', minutes: 3,
      cards: [
        { title: 'Ponerse en el lugar', text: 'La empatía es comprender lo que siente otra persona sin juzgarla, aunque no compartas su punto de vista.' },
        { title: 'Validar', text: '«Tiene sentido que te sientas así» acompaña más que «no es para tanto».' },
      ],
      quiz: [tf('Ser empático significa estar de acuerdo con todo.', false, 'Puedes comprender una emoción sin compartir la opinión.')],
      reflection: 'Recuerda un momento en que alguien te validó. ¿Qué te dijo?',
      challenge: 'Valida hoy la emoción de alguien con una frase sencilla.',
    },
    {
      title: 'Comunicación no violenta', minutes: 4,
      cards: [
        { title: 'Cuatro pasos', text: 'Propuesta por Marshall Rosenberg: observar sin juzgar, expresar lo que sientes, identificar tu necesidad y hacer una petición concreta.' },
        { title: 'Ejemplo', text: '«Cuando llegas tarde sin avisar (hecho) me preocupo (emoción) porque necesito saber que estás bien (necesidad). ¿Puedes enviarme un mensaje? (petición)».' },
      ],
      quiz: [ch('¿Cuál es una observación sin juicio?', ['Siempre llegas tarde', 'Eres un desastre', 'Hoy has llegado a las 9:30', 'Nunca te importa'], 2, 'Describe un hecho concreto.')],
      reflection: 'Reescribe una queja reciente siguiendo los cuatro pasos.',
      challenge: 'Usa la estructura hecho–emoción–necesidad–petición en una conversación.',
    },
    {
      title: 'Gratitud y vínculos', minutes: 3, tool: 'gratitude',
      cards: [
        { title: 'Decir gracias', text: 'Expresar gratitud de forma concreta fortalece las relaciones y mejora el ánimo de quien la da y de quien la recibe.' },
        { title: 'Concreto', text: '«Gracias por escucharme ayer cuando estaba agobiado» llega más lejos que un «gracias por todo».' },
      ],
      quiz: [tf('La gratitud concreta suele tener más impacto que la genérica.', true, 'Muestra que te has fijado.')],
      reflection: '¿A quién le debes un agradecimiento concreto?',
      challenge: 'Envía hoy un mensaje de agradecimiento específico a alguien.',
    },
    {
      title: 'Reto de siete días', minutes: 2,
      cards: [{ title: 'Una semana de conexión', text: 'Cada día: nombra una emoción, escucha a alguien, valida, agradece o pide algo con claridad.' }],
      quiz: [tf('Las habilidades emocionales mejoran con la práctica diaria.', true, 'Como cualquier habilidad.')],
      reflection: '¿Qué has descubierto sobre tus emociones esta semana?',
      challenge: 'Registra una acción de inteligencia emocional cada día durante siete días.',
    },
  ],
  fisica: [
    {
      title: 'Moverse cuenta', minutes: 3,
      cards: [
        { title: 'Recomendación de la OMS', text: 'Para adultos: entre 150 y 300 minutos semanales de actividad moderada (o 75–150 de intensa), y fortalecer los músculos dos o más días por semana.' },
        { title: 'Todo suma', text: 'Subir escaleras, caminar a hacer recados o bailar en casa también es actividad física.' },
      ],
      quiz: [
        ch('¿Cuántos minutos semanales de actividad moderada recomienda la OMS como mínimo?', ['30', '60', '150', '500'], 2, 'Entre 150 y 300 minutos a la semana.'),
        tf('Solo cuenta el ejercicio si es en un gimnasio.', false, 'Cualquier movimiento suma.'),
      ],
      reflection: '¿Qué tipo de movimiento disfrutas de verdad?',
      challenge: 'Suma hoy 20 minutos de movimiento a tu manera.',
    },
    {
      title: 'Menos tiempo sentado', minutes: 3,
      cards: [
        { title: 'Sedentarismo', text: 'Pasar muchas horas sentado tiene efectos propios, incluso si haces deporte. Interrumpirlo con pausas activas ayuda.' },
        { title: 'Pausas activas', text: 'Cada 30–60 minutos, levántate, estírate o camina un par de minutos.' },
      ],
      quiz: [tf('Interrumpir el tiempo sentado con pausas es beneficioso.', true, 'La OMS recomienda reducir el sedentarismo.')],
      reflection: '¿En qué momentos del día pasas más tiempo sentado?',
      challenge: 'Programa tres pausas activas hoy.',
    },
    {
      title: 'Fuerza a cualquier edad', minutes: 4,
      cards: [
        { title: 'Músculos y salud', text: 'El trabajo de fuerza mantiene la masa muscular y ósea, mejora el equilibrio y facilita las tareas diarias.' },
        { title: 'Con tu peso', text: 'Sentadillas, flexiones apoyando rodillas o subir un escalón son buenos inicios. Prioriza la técnica sobre la cantidad.' },
      ],
      quiz: [ch('¿Cuántos días por semana recomienda la OMS ejercicios de fuerza?', ['Ninguno', '2 o más', 'Solo 1 al mes', '7 obligatoriamente'], 1, 'Dos o más días por semana.')],
      reflection: '¿Qué ejercicio de fuerza podrías hacer en casa?',
      challenge: 'Haz 3 series de 10 sentadillas (adaptadas a ti).',
    },
    {
      title: 'Estirar y movilidad', minutes: 3, tool: 'timer',
      cards: [
        { title: 'Articulaciones felices', text: 'La movilidad mantiene el rango de movimiento. Unos minutos al día de cuello, hombros, cadera y tobillos marcan diferencia.' },
        { title: 'Sin dolor', text: 'Estira hasta notar tensión agradable, nunca dolor. Respira de forma tranquila.' },
      ],
      quiz: [tf('Al estirar hay que llegar al dolor para que funcione.', false, 'Tensión agradable, sin dolor.')],
      reflection: '¿Qué parte de tu cuerpo agradece más un estiramiento?',
      challenge: 'Usa el temporizador para una rutina de movilidad de 5 minutos.',
    },
    {
      title: 'El descanso también entrena', minutes: 3,
      cards: [
        { title: 'Recuperación', text: 'Los músculos se adaptan durante el descanso. Dormir bien y alternar intensidades evita lesiones.' },
        { title: 'Escucha tu cuerpo', text: 'El cansancio extremo o el dolor persistente son señales para bajar el ritmo y, si se mantienen, consultar.' },
      ],
      quiz: [tf('Los días de descanso son parte del entrenamiento.', true, 'La adaptación ocurre en la recuperación.')],
      reflection: '¿Cómo sabes que necesitas descansar?',
      challenge: 'Planifica un día de descanso activo esta semana (paseo suave, estiramientos).',
    },
    {
      title: 'Constancia antes que intensidad', minutes: 3,
      cards: [
        { title: 'Lo sostenible gana', text: 'Un paseo diario de 20 minutos mantenido durante meses aporta más que un entrenamiento extremo que abandonas a la semana.' },
        { title: 'Regla de los dos minutos', text: 'Si no tienes ganas, comprométete solo a empezar dos minutos. A menudo seguirás.' },
      ],
      quiz: [ch('¿Qué es más útil a largo plazo?', ['Entrenar muy fuerte una vez', 'Moverte un poco casi cada día', 'Esperar a tener tiempo', 'Ninguna'], 1, 'La regularidad construye el hábito.')],
      reflection: '¿Qué versión mínima de tu ejercicio podrías hacer incluso en un mal día?',
      challenge: 'Crea un objetivo semanal de movimiento realista.',
    },
    {
      title: 'Reto de siete días', minutes: 2,
      cards: [{ title: 'Una semana en movimiento', text: 'Cada día, algo de movimiento: caminar, fuerza, movilidad o deporte. Uno de los días puede ser de descanso activo.' }],
      quiz: [tf('Un día de descanso activo puede formar parte del reto.', true, 'El descanso es parte del plan.')],
      reflection: '¿Qué movimiento te ha hecho sentir mejor esta semana?',
      challenge: 'Registra una acción de salud física cada día durante siete días.',
    },
  ],
  alimentacion: [
    {
      title: 'El plato saludable', minutes: 3,
      cards: [
        { title: 'Una guía visual', text: 'El Plato para Comer Saludable de Harvard propone: la mitad verduras y frutas, un cuarto cereales integrales y un cuarto proteína saludable.' },
        { title: 'Para beber', text: 'Agua como bebida principal. Aceites saludables, como el de oliva, para cocinar y aliñar.' },
      ],
      quiz: [
        ch('¿Qué proporción del plato deberían ocupar verduras y frutas?', ['Un cuarto', 'La mitad', 'Nada', 'Todo'], 1, 'La mitad del plato.'),
        tf('El agua es la bebida recomendada como principal.', true, 'Sin azúcares añadidos ni calorías.'),
      ],
      reflection: '¿Cómo se parece tu comida de hoy al plato saludable?',
      challenge: 'Fotografía un plato con la mitad de verduras.',
    },
    {
      title: 'Hidratación', minutes: 3,
      cards: [
        { title: 'Agua a lo largo del día', text: 'Las necesidades varían según la persona, el clima y la actividad. Una referencia sencilla: beber regularmente y que la orina sea de color claro.' },
        { title: 'Trucos', text: 'Ten una botella a la vista, bebe un vaso al despertar y acompaña cada comida con agua.' },
      ],
      quiz: [tf('Las necesidades de agua son iguales para todas las personas.', false, 'Dependen del cuerpo, el clima y la actividad.')],
      reflection: '¿En qué momento del día olvidas beber agua?',
      challenge: 'Lleva hoy una botella de agua contigo.',
    },
    {
      title: 'Comer con atención', minutes: 4,
      cards: [
        { title: 'Alimentación consciente', text: 'Comer despacio y sin pantallas ayuda a reconocer las señales de hambre y saciedad y a disfrutar más de la comida.' },
        { title: 'Escala del hambre', text: 'Antes de comer, pregúntate del 1 al 10 cuánta hambre tienes. A mitad de plato, vuelve a preguntártelo.' },
      ],
      quiz: [ch('¿Qué favorece reconocer la saciedad?', ['Comer muy rápido', 'Comer viendo series', 'Comer despacio y atento', 'Saltarse comidas'], 2, 'La atención ayuda a escuchar al cuerpo.')],
      reflection: '¿Cómo cambia el sabor cuando comes sin distracciones?',
      challenge: 'Haz una comida hoy sin pantallas.',
    },
    {
      title: 'Cocinar en casa', minutes: 3,
      cards: [
        { title: 'Control y disfrute', text: 'Cocinar te permite elegir ingredientes, reducir ultraprocesados y compartir tiempo con otros.' },
        { title: 'Planificar', text: 'Planificar el menú semanal y cocinar en tandas ahorra tiempo y dinero.' },
      ],
      quiz: [tf('Planificar el menú puede ahorrar tiempo y dinero.', true, 'Y reduce el desperdicio.')],
      reflection: '¿Qué receta sencilla y saludable te gustaría dominar?',
      challenge: 'Cocina hoy una receta con al menos tres verduras.',
    },
    {
      title: 'Leer etiquetas', minutes: 4,
      cards: [
        { title: 'La lista de ingredientes', text: 'Los ingredientes aparecen ordenados de mayor a menor cantidad. Si el azúcar está entre los primeros, es un producto muy azucarado.' },
        { title: 'Menos ingredientes', text: 'Como regla práctica, cuanto más corta y reconocible la lista, menos procesado suele ser el alimento.' },
      ],
      quiz: [ch('En la lista de ingredientes, el primero es…', ['El que menos hay', 'El que más hay', 'El más caro', 'Aleatorio'], 1, 'Se ordenan de mayor a menor cantidad.')],
      reflection: '¿Qué producto habitual te sorprendería leer su etiqueta?',
      challenge: 'Lee hoy la etiqueta de un producto que compres a menudo.',
    },
    {
      title: 'Una relación amable con la comida', minutes: 3,
      cards: [
        { title: 'Sin culpa', text: 'No hay alimentos «prohibidos»: importa el conjunto de tu alimentación. La culpa suele empeorar la relación con la comida.' },
        { title: 'Pide ayuda', text: 'Si la comida te genera mucha ansiedad o preocupación, habla con un profesional sanitario.' },
      ],
      quiz: [tf('Lo importante es el patrón general de alimentación, no un alimento aislado.', true, 'El conjunto es lo que cuenta.')],
      reflection: '¿Qué comida te recuerda a un momento feliz?',
      challenge: 'Comparte una comida con alguien y disfrútala sin juzgarte.',
    },
    {
      title: 'Reto de siete días', minutes: 2,
      cards: [{ title: 'Una semana nutritiva', text: 'Cada día, un gesto: más verduras, agua, comer atento, cocinar o leer una etiqueta.' }],
      quiz: [tf('Los pequeños cambios mantenidos suelen funcionar mejor que las dietas estrictas.', true, 'Son más sostenibles.')],
      reflection: '¿Qué cambio en tu alimentación ha sido más fácil de mantener?',
      challenge: 'Registra una acción de alimentación cada día durante siete días.',
    },
  ],
  digital: [
    {
      title: 'Tu relación con las pantallas', minutes: 3,
      cards: [
        { title: 'Diseñadas para engancharte', text: 'Muchas apps usan notificaciones, scroll infinito y recompensas variables para captar tu atención el mayor tiempo posible.' },
        { title: 'Uso consciente', text: 'No se trata de demonizar la tecnología, sino de decidir tú cuándo y para qué la usas.' },
      ],
      quiz: [
        tf('El scroll infinito está pensado para que sigas mirando.', true, 'Elimina los puntos naturales de parada.'),
        ch('El objetivo de la desintoxicación digital es…', ['No usar nunca el móvil', 'Usar la tecnología de forma intencional', 'Usarlo más', 'Ninguno'], 1, 'Tú decides cuándo y para qué.'),
      ],
      reflection: '¿Qué app abres sin pensar? ¿Qué buscas cuando lo haces?',
      challenge: 'Mira tu tiempo de pantalla de ayer sin juzgarte.',
    },
    {
      title: 'Notificaciones bajo control', minutes: 3,
      cards: [
        { title: 'Interrupciones', text: 'Cada notificación interrumpe lo que haces y retomar la concentración lleva tiempo.' },
        { title: 'Haz limpieza', text: 'Deja activas solo las de personas, no las de apps. Usa los modos de concentración del móvil.' },
      ],
      quiz: [tf('Desactivar notificaciones no esenciales ayuda a concentrarse.', true, 'Menos interrupciones, más foco.')],
      reflection: '¿Qué notificaciones podrías eliminar hoy mismo?',
      challenge: 'Desactiva las notificaciones de tres apps.',
    },
    {
      title: 'Espacios libres de móvil', minutes: 3,
      cards: [
        { title: 'El dormitorio', text: 'La luz y los estímulos de la pantalla antes de dormir pueden retrasar el sueño. Un despertador clásico ayuda.' },
        { title: 'La mesa', text: 'Comer sin móvil mejora la conversación y la atención a la comida.' },
      ],
      quiz: [ch('¿Qué lugar es ideal para dejarlo libre de móvil?', ['El dormitorio', 'La mesa', 'Ambos', 'Ninguno'], 2, 'Son dos espacios clave para el descanso y la conexión.')],
      reflection: '¿Qué espacio de tu casa quieres liberar de pantallas?',
      challenge: 'Esta noche, carga el móvil fuera del dormitorio.',
    },
    {
      title: 'Atención plena', minutes: 4, tool: 'timer',
      cards: [
        { title: 'Monotarea', text: 'Hacer una cosa cada vez es más eficaz que saltar entre tareas, que fragmenta la atención.' },
        { title: 'Bloques de foco', text: 'Trabaja 25 minutos con el móvil en otra habitación y descansa 5. Repite.' },
      ],
      quiz: [tf('Hacer varias tareas a la vez suele reducir la calidad de cada una.', true, 'Cambiar de tarea tiene un coste.')],
      reflection: '¿Qué tarea mereces hacer con toda tu atención?',
      challenge: 'Haz un bloque de 25 minutos sin móvil con el temporizador.',
    },
    {
      title: 'Redes sociales con intención', minutes: 3,
      cards: [
        { title: 'Comparación', text: 'Las redes muestran fragmentos editados de la vida de otros. Compararse con ellos puede afectar a la autoestima.' },
        { title: 'Cura tu feed', text: 'Deja de seguir cuentas que te hacen sentir peor y sigue las que te inspiran o enseñan.' },
      ],
      quiz: [tf('Lo que vemos en redes suele ser una versión editada de la realidad.', true, 'Por eso compararse es injusto contigo.')],
      reflection: '¿Qué cuentas te hacen sentir bien y cuáles no?',
      challenge: 'Deja de seguir tres cuentas que no te aportan.',
    },
    {
      title: 'Aburrirse está bien', minutes: 3,
      cards: [
        { title: 'Espacio para la mente', text: 'Los momentos sin estímulos favorecen la creatividad y el descanso mental.' },
        { title: 'Sin rellenar', text: 'En la cola o en el transporte, prueba a no sacar el móvil y observar.' },
      ],
      quiz: [tf('El aburrimiento puede favorecer la creatividad.', true, 'Deja espacio a la mente divagante.')],
      reflection: '¿Qué se te ocurrió la última vez que estuviste sin hacer nada?',
      challenge: 'Espera hoy en algún sitio sin mirar el móvil.',
    },
    {
      title: 'Reto de siete días', minutes: 2,
      cards: [{ title: 'Una semana más presente', text: 'Cada día, un gesto: menos notificaciones, una comida sin móvil, un bloque de foco o una tarde desconectado.' }],
      quiz: [tf('Desconectar un rato cada día es más sostenible que una desconexión total puntual.', true, 'El hábito diario se mantiene mejor.')],
      reflection: '¿Qué has recuperado al usar menos el móvil?',
      challenge: 'Registra una acción de desconexión digital cada día durante siete días.',
    },
  ],
  espiritual: [
    {
      title: 'Una búsqueda personal', minutes: 3,
      cards: [
        { title: 'Para todas las personas', text: 'La indagación espiritual es preguntarse por el sentido, los valores y lo que nos trasciende. Puede vivirse desde una religión, desde la filosofía o desde ninguna creencia.' },
        { title: 'Preguntas abiertas', text: '¿Qué es importante para mí? ¿Qué quiero aportar? No hay respuestas correctas, solo honestas.' },
      ],
      quiz: [tf('La indagación espiritual requiere pertenecer a una religión.', false, 'Está abierta a cualquier creencia o a ninguna.')],
      reflection: '¿Qué pregunta importante te acompaña últimamente?',
      challenge: 'Dedica cinco minutos a escribir sin filtro sobre lo que te importa.',
    },
    {
      title: 'Meditar: primeros pasos', minutes: 4, tool: 'timer',
      cards: [
        { title: 'Atención a la respiración', text: 'Siéntate cómodo, cierra los ojos y nota cómo entra y sale el aire. Cuando la mente se vaya, y se irá, vuelve amablemente.' },
        { title: 'Volver es meditar', text: 'Distraerse no es fallar. Cada vez que vuelves a la respiración entrenas la atención.' },
      ],
      quiz: [tf('Si te distraes al meditar, lo estás haciendo mal.', false, 'Darte cuenta y volver es la práctica.')],
      reflection: '¿Adónde se fue tu mente durante la meditación?',
      challenge: 'Medita cinco minutos con el temporizador.',
    },
    {
      title: 'Gratitud', minutes: 3, tool: 'gratitude',
      cards: [
        { title: 'Entrenar la mirada', text: 'Anotar regularmente cosas por las que estás agradecido se ha asociado con más emociones positivas.' },
        { title: 'Específico y nuevo', text: 'Intenta que cada gratitud sea concreta y distinta a la de ayer.' },
      ],
      quiz: [ch('¿Qué hace más eficaz un diario de gratitud?', ['Repetir siempre lo mismo', 'Ser concreto y variado', 'Escribir solo cosas grandes', 'No escribir'], 1, 'Lo concreto y nuevo mantiene la atención fresca.')],
      reflection: 'Escribe tres cosas concretas por las que hoy das las gracias.',
      challenge: 'Usa la herramienta de gratitud antes de dormir.',
    },
    {
      title: 'Tus valores', minutes: 4,
      cards: [
        { title: 'Brújula', text: 'Los valores son direcciones que eliges (honestidad, cuidado, creatividad…). A diferencia de las metas, nunca se terminan.' },
        { title: 'Coherencia', text: 'Vivir cerca de tus valores suele dar sensación de sentido, incluso en momentos difíciles.' },
      ],
      quiz: [tf('Un valor es algo que se completa y se tacha.', false, 'Es una dirección, no un destino.')],
      reflection: 'Elige tus tres valores principales y una acción que exprese cada uno.',
      challenge: 'Haz hoy algo pequeño que refleje uno de tus valores.',
    },
    {
      title: 'Propósito', minutes: 3,
      cards: [
        { title: 'Sentido', text: 'Viktor Frankl, psiquiatra superviviente de los campos de concentración, defendió que encontrar sentido ayuda a sostenerse en la adversidad.' },
        { title: 'En lo cotidiano', text: 'El propósito no tiene que ser grandioso: cuidar a alguien, aprender o crear también dan sentido.' },
      ],
      quiz: [tf('El propósito tiene que ser algo grandioso.', false, 'Lo cotidiano también da sentido.')],
      reflection: '¿Para quién o para qué te levantas con ganas?',
      challenge: 'Escribe una frase que resuma lo que quieres aportar.',
    },
    {
      title: 'Contemplar', minutes: 3,
      cards: [
        { title: 'Asombro', text: 'Un atardecer, el cielo estrellado o una obra de arte pueden provocar asombro, una emoción que nos hace sentir parte de algo mayor.' },
        { title: 'Haz espacio', text: 'Reserva unos minutos para mirar sin prisa algo bello.' },
      ],
      quiz: [tf('El asombro puede hacernos sentir parte de algo mayor.', true, 'Es una de sus características.')],
      reflection: '¿Qué te provocó asombro la última vez?',
      challenge: 'Contempla un atardecer o el cielo durante cinco minutos.',
    },
    {
      title: 'Reto de siete días', minutes: 2,
      cards: [{ title: 'Una semana con sentido', text: 'Cada día: meditar, agradecer, revisar valores, contemplar o escribir sobre tu propósito.' }],
      quiz: [tf('La indagación espiritual puede practicarse en pocos minutos al día.', true, 'Pequeños espacios, gran impacto.')],
      reflection: '¿Qué has aprendido sobre ti esta semana?',
      challenge: 'Registra una acción de indagación espiritual cada día durante siete días.',
    },
  ],
};

export const LESSONS: Lesson[] = (Object.keys(RAW) as PillarId[]).flatMap((p) =>
  RAW[p].map((l, i) => ({ ...l, id: `${p}-${i + 1}`, pillar: p, level: i + 1 })),
);

export const lessonsFor = (p: PillarId) => LESSONS.filter((l) => l.pillar === p);
export const lessonById = (id: string) => LESSONS.find((l) => l.id === id);

export const XP_PER_LESSON = 20;
export const XP_PERFECT_BONUS = 5;
