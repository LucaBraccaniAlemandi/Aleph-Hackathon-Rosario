# Bitácora de campos arrendados (nombre provisorio)

## Una frase
Para **el arrendatario que trabaja varios campos ajenos** (y **el dueño de cada campo**), cuando **una labor, una lluvia o una máquina cambia el plan**, convertimos **los mensajes y audios de WhatsApp que ya se mandan** en un registro trazable por campo y por zona, para que **el arrendatario planifique sus máquinas entre campos y el dueño vea qué se hizo en su tierra sin pedirlo**.

## Problema

### Contexto: cómo funciona el arrendamiento
- Ley 13.246: el plazo mínimo general es de 3 años (art. 4), pero los **contratos accidentales** (art. 39) se hacen por una o hasta dos cosechas. Por eso la relación se renegocia cada campaña.
- El precio suele estar en **quintales (de soja) por hectárea**, pagados en pesos al valor de referencia (MATBA-ROFEX / FAS).
- El arrendatario típico trabaja varios campos de dueños distintos, con su propia maquinaria o con contratistas.
- **Sin verificar:** qué tan comunes son las cláusulas de rotación, fertilización o conservación de suelo en los contratos accidentales. Hay que confirmarlo con un contrato real o con un abogado o asesor del sector.

### Dolores candidatos (elegir cuál lidera, ver *Decisiones pendientes*)
| # | Dolor | Quién lo siente | Por qué importa |
|---|---|---|---|
| A | **"No sé qué se hizo en mi campo."** El dueño se entera por llamados sueltos, y al renovar no tiene con qué evaluar si el arrendatario cuidó el suelo y cumplió lo pactado (rotación, fertilización). | Dueño | Al renovar cada 1–2 cosechas, un historial verificable es poder de negociación para los dos: el arrendatario que cumple lo puede **mostrar**. |
| B | **"Tengo la info de 6 campos repartida en 6 chats."** Labores, dosis, lluvias y problemas quedan en grupos de WhatsApp, cuadernos y en la memoria del encargado. | Arrendatario | Pierde tiempo, repite preguntas y no puede costear por lote ni comparar campos. |
| C | **"No sé a qué campo mandar la sembradora la semana que viene."** Con lluvias distintas en cada campo y pocas máquinas, decide a ojo cuándo y dónde se puede entrar. | Arrendatario / contratista | Una ventana de siembra o pulverización perdida cuesta rinde. |

> Hipótesis de cuña: **B es el dolor diario y A es lo que diferencia al producto.** El registro se arma para el arrendatario, y el reporte al dueño sale gratis de ese registro. C es la capa de valor siguiente. *No está decidido.*

## Solución

### Núcleo: WhatsApp → registro estructurado
El input principal es **lo que ya se manda por WhatsApp**: texto, audio y foto. Nadie tiene que abrir una app nueva para cargar datos.

**Flujo:**
1. El encargado, el maquinista o el arrendatario escribe o manda un audio a un número de WhatsApp (o se reenvían mensajes del grupo).
2. Audio → texto (speech-to-text que tolere el español rioplatense).
3. Un LLM extrae los datos a un esquema fijo, usando como contexto el catálogo de campos, lotes, insumos y máquinas de ese arrendatario.
4. **Si la confianza es baja, o falta un dato obligatorio**, el bot responde con un resumen y pide confirmar o corregir (*"¿Lote 3 de La Esperanza, urea 80 kg/ha, ayer? Sí / Corregir"*). El registro solo queda firme cuando alguien confirma.
5. El evento se agrega a un **log append-only** del campo. Nunca se edita: una corrección es otro evento que referencia al anterior.

**Esquema del evento (borrador):**
```json
{
  "id": "evt_…",
  "farm": "La Esperanza",
  "plot_zone": "Lote 3 / Zona baja",
  "activity_type": "sowing | fertilization | spraying | harvest | field_check | manual_rainfall | incident",
  "activity_date": "2026-11-26",
  "crop": "corn",
  "input": "urea",
  "rate": { "value": 80, "unit": "kg/ha" },
  "area_ha": 45,
  "machine": "Sembradora 16 surcos",
  "operator": "Juan",
  "source": { "channel": "whatsapp", "type": "audio", "msg_id": "…", "transcript": "…" },
  "confidence": 0.82,
  "status": "confirmed | pending | corrected",
  "corrects": null
}
```

**Mensajes de ejemplo — ⚠️ SINTÉTICOS (reemplazar por un export real si se consigue):**
| Mensaje | Extracción esperada | ¿Pide confirmar? |
|---|---|---|
| 🎤 *"Che, ayer terminamos de sembrar el 3 de La Esperanza, le pusimos 80 kilos de urea"* | `sowing` + `fertilization`, La Esperanza / Lote 3, urea 80 kg/ha, `activity_date` = ayer | No (todo resuelto) |
| *"Llovieron 35 en lo de Gómez"* | `manual_rainfall`, `farm` "Gómez" → resolver contra el catálogo, 35 mm, hoy | Sí, si "Gómez" es ambiguo |
| 📷 + *"Mirá esto en el bajo"* | `incident`, `plot_zone` "bajo" (¿de qué campo?), foto adjunta | Sí: falta el campo |
| *"Mañana entra la pulverizadora al 5"* | Plan (no labor hecha) → va al módulo de maquinaria | Sí: ¿qué campo tiene "lote 5"? |

### Módulos que se apoyan en el log
| Módulo | Qué es | Qué le suma al dolor | Alcance |
|---|---|---|---|
| **Mapas por campo y zonas** | Polígonos GeoJSON de cada campo y lote. Las zonas se dibujan a mano o se generan por NDVI histórico (Sentinel-2). Cada evento cae en una zona, y la zona muestra su historial. | A y B: "qué pasó acá" se responde mirando el mapa. | **Demo:** polígonos + zonas dibujadas a mano. **Roadmap:** zonas por NDVI. |
| **Clima en tiempo real por campo** | Open-Meteo con las coordenadas de cada campo: lluvia acumulada, pronóstico y alertas (helada, granizo, exceso hídrico). Se contrasta con la lluvia que reporta la gente por WhatsApp. | B y C: lluvia real por campo sin preguntar. Además alimenta el cálculo de días trabajables. | **Demo:** lluvia últimos 7 días + pronóstico. **Roadmap:** alertas push. |
| **Maquinaria y planificación** | Catálogo de máquinas del arrendatario (ancho, velocidad, eficiencia). Capacidad = ancho × velocidad × eficiencia de campo (rangos ASABE por tipo de labor). Un día es trabajable si pasa la regla "no entrar X días después de > N mm" (parametrizable). Se asignan máquinas a campos sumando tiempo de traslado (OSRM). | C: plan de los próximos días por máquina y campo. | **Demo:** plan simple de 5 días para 1–2 máquinas. **Roadmap:** optimización real y replanificación automática. |
| **Reporte al dueño** | Ver abajo. | A | **Demo** |

### Reporte al dueño
Una página (o PDF, o mensaje de WhatsApp) **por campo y campaña**:
- Mapa del campo con las zonas y las labores hechas en cada una.
- Línea de tiempo: siembra → fertilización → aplicaciones → cosecha, con fechas, insumos y dosis.
- Lluvia acumulada de la campaña.
- **Contraste con las cláusulas del contrato** (si las hay): rotación pactada vs. cultivo realizado, fertilización mínima, prohibiciones. Cada cláusula se marca ✅ / ⚠️ / sin datos.
- Cada línea indica de dónde salió: mensaje original, quién y cuándo lo confirmó.
- *Abierto:* anclar los hashes del log en una cadena pública o con timestamping, para que el dueño no tenga que confiar en la base de datos del arrendatario (ver *Decisiones pendientes*).

### Qué ya existe y por qué no alcanza
| Producto | Qué hace (según fuentes) | Hueco para este usuario |
|---|---|---|
| **Auravant** (AR) | Monitoreo satelital, registro de siembras, aplicaciones y cosechas, informes PDF compartibles. Gratis hasta 3.000 ha. | La carga es en la app: alguien tiene que sentarse a cargar. No está pensado para la relación arrendatario–dueño. |
| **Albor Go!** (AR) | Registro de labores por lote, gratuito. | Mismo supuesto de carga manual. *Funciones no verificadas en detalle.* |
| **Fieldata** (AR) | Gestión **ganadera** con mensajes y audios de WhatsApp. | Valida el canal WhatsApp en Argentina, pero es ganadería, no agricultura extensiva en campos arrendados. |
| **Agro4Data – Agente de Campo** (ES) | Registra labores y tratamientos desde audio, texto y foto por WhatsApp. | Enfocado en España (cumplimiento SIEX). No modela arrendamiento ni varios dueños. |
| **Aegrozap / Aegro** (BR) | Bot de WhatsApp que interpreta audio y pide aprobación antes de guardar. | Brasil, atado a Aegro. Valida el patrón "confirmar antes de guardar". |
| 365FarmNet, xFarm, Agrology | — | **Sin verificar.** No se encontraron datos confiables en la búsqueda. |

**Diferencial:** nadie de los verificados junta (1) la captura por WhatsApp para agricultura extensiva, (2) un arrendatario con **muchos campos de dueños distintos**, y (3) un **reporte de cumplimiento para el dueño**.

## Datos / APIs
Ver [`hackathon/data-sources.md`](../../hackathon/data-sources.md) (los links de ahí también figuran como "no verificados").
- **Open-Meteo** → lluvia horaria histórica y pronóstico por coordenada de campo (sin key).
- **Copernicus Browser / Google Earth Engine** → Sentinel-2 NDVI para zonas (roadmap) y para el fondo del mapa.
- **OSRM** → tiempo de traslado de maquinaria entre campos.
- **OpenStreetMap** → base del mapa.
- **WhatsApp Business Cloud API** o **Twilio WhatsApp sandbox** → canal de entrada y respuestas. *No está en data-sources.md: verificar el tiempo de alta (el sandbox de Twilio suele ser lo más rápido para un hackathon).*
- **Speech-to-text** (p. ej. Whisper) → transcripción de audios. *Sin verificar la calidad con audio de campo (ruido, cortes).*
- **LLM** → extracción al esquema y resolución de nombres contra el catálogo.
- **Ley 13.246** → texto vigente en Infoleg (verificar) para el contexto de contratos.

## Demo (3 minutos)
1. **(0:00–0:30) El problema.** Pantalla con 6 grupos de WhatsApp desordenados: "Así lleva hoy un arrendatario 6 campos de 4 dueños distintos."
2. **(0:30–1:30) Entra un mensaje.** En vivo, alguien del equipo manda un audio: *"Terminamos de sembrar el 3 de La Esperanza, 80 de urea."*
   - El bot responde con el resumen para confirmar → se toca "Sí".
   - En el tablero: el evento aparece en la línea de tiempo y el **Lote 3 se pinta en el mapa** de La Esperanza.
   - Se manda un segundo mensaje ambiguo ("Llovieron 35 en lo de Gómez") → el bot pregunta qué campo es: **se ve que no inventa datos.**
3. **(1:30–2:15) El dueño.** Se abre el reporte de La Esperanza: mapa, historial de la campaña, lluvia acumulada (Open-Meteo) y la cláusula de rotación marcada ✅.
4. **(2:15–2:50) La semana que viene.** Plan de maquinaria: la lluvia del campo Gómez lo deja no trabajable hasta el jueves, así que la sembradora va primero a La Esperanza. Se muestran los ha/día y el traslado.
5. **(2:50–3:00) Cierre.** "El arrendatario no carga nada nuevo, el dueño ve su campo, y las máquinas van a donde se puede entrar."

## Validación
Lo que demuestra que esto está bien, además de nosotros:
- **Usuarios reales:** que 1 arrendatario y 1 dueño (aunque sea por teléfono) reconozcan el reporte como "lo que querría ver", y digan qué falta. Es el criterio del jurado en `general.md`.
- **Precisión de extracción:** etiquetar a mano N mensajes reales (de un export real; si no, sintéticos escritos **por otra persona**) y medir los campos bien extraídos, y cuántas veces el bot pidió confirmar cuando hacía falta y cuando no.
- **Lluvia:** comparar Open-Meteo para las fechas y coordenadas de un campo con un pluviómetro local o con mapas de lluvia de la BCR o la provincia.
- **Maquinaria:** pasar el planificador con las fechas y lluvias de la campaña pasada y comparar con lo que el contratista hizo realmente.

## Decisiones pendientes
- [ ] **Qué dolor lidera el pitch y el demo:** A (dueño), B (arrendatario multicampo), C (maquinaria), o la combinación propuesta (B como cuña, A como diferencial).
- [ ] **Quién paga:** arrendatario, dueño, contratista, o un tercero (acopio, cooperativa, asesor).
- [ ] **Datos reales vs. sintéticos:** ¿conseguimos un export real de WhatsApp (.txt + audios), un contrato real y los polígonos de un campo conocido? Si no, todo lo sintético va marcado como tal.
- [ ] **Zonas:** dibujadas a mano vs. por NDVI, para el demo.
- [ ] **Qué módulos entran en el demo** y cuáles quedan como roadmap (la tabla de módulos es una propuesta).
- [ ] **Anclaje criptográfico del log** (hash en cadena pública o timestamping): sí, no, o mencionarlo solo como roadmap. Aleph tiene una pata de tokenización, pero no es obligatorio.
- [ ] **Canal:** WhatsApp Business Cloud API vs. Twilio sandbox vs. simular el chat en la web para el demo.
- [ ] **Stack** (frontend, backend, mapa) y quién del equipo hace qué.
- [ ] **Nombre** del proyecto.

## Notas
- Fuentes consultadas para esta versión (27/11/2026): Auravant ([App Store](https://apps.apple.com/mx/app/auravant/id1437579869), [Forbes AR](https://www.forbesargentina.com/especiales/auravant-detras-escena-empresa-monitorea-52-millones-hectareas-todo-mundo-n4097/amp), [Maquinac](https://maquinac.com/wp-content/uploads/2019/11/Tecnologías-digitales-al-servicio-del-agro.pdf)), Albor Go! ([Infocampo](https://www.infocampo.com.ar/?p=400539)), Fieldata ([Bichos de Campo](https://bichosdecampo.com/el-caso-fieldata-dos-jovenes-desde-los-extremos-del-continente-disenaron-un-sistema-que-permite-mejorar-la-gestion-de-las-empresas-ganaderas-a-partir-de-sencillos-mensajes-de-whatsapp)), Agro4Data ([G2](https://www.g2.com/sellers/agro4data)), Aegrozap ([Agrolink](https://www.agrolink.com.br/noticias/o-fim-do-aplicativo-no-talhao--operadores-de-maquina-preferem-o-whatsapp_518097.html)), Ley 13.246 ([produccion-animal.com.ar](https://www.produccion-animal.com.ar/legales/02-contratos_agrarios_leyes_13246_y_22298.pdf), [abogados.com.ar](https://abogados.com.ar/index.php/apuntes-sobre-los-contratos-agropecuarios-y-las-leyes-que-los-rigen/19326)). Son fuentes secundarias o de marketing: alcanzan para el pitch, no para afirmar funciones exactas de cada producto.
- Riesgo técnico principal: la calidad del speech-to-text con audio de campo y la resolución de nombres informales ("lo de Gómez", "el bajo"). Mitigación: el catálogo de alias por campo y la confirmación obligatoria cuando la confianza es baja.
