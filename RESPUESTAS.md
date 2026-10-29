# Respuestas · Laboratorio 4
Alumno: [20222159]
Presupuesto: [8] min  Métrica DORA: [time to restore]

## Parte 1 · Diagnóstico
### Defecto 1
- Job y etapa: smoke, pre-deploy (needs: build-push, corre en paralelo a deploy)
- Problema que causa en el pipeline: smoke prueba antes de que deploy termine, así que puede fallar con 403 o validar la versión anterior. Además no verifica que la versión desplegada sea la del commit, porque EXPECTED_COMMIT nunca se define
- Link al commit: https://github.com/Kiridas/INF384-lab4-dev/tree/17e20215826f4e12dccde7e672c9ef7c4265e06c
- Corrección (una o más: mover de etapa / dejar como informativo / eliminar / ajustar configuración / modificar tests): mover de etapa (needs: deploy) y ajustar configuración (EXPECTED_COMMIT: ${{ github.sha }})
- Evidencia (dato observado, con link al run o fragmento de la salida local): en el run #2, smoke inició a las 21:17:10 y su primer curl devolvió "403" a las 21:17:25.80, antes de que deploy publicara la URL a las 21:17:26. El log no tiene la línea "commit:" porque la comprobación quedó inactiva. Link al run: https://github.com/Kiridas/INF384-lab4-dev/actions/runs/40956282764
### Defecto 2
- Job y etapa: e2e, post-deploy 
- Problema que causa en el pipeline: 9 de 10 pruebas son llamadas HTTP que ya cubre integration. Se paga la instalación de Chromium con dependencias del sistema para una sola prueba que usa el navegador.
- Link al commit: https://github.com/Kiridas/INF384-lab4-dev/tree/f0127570d5eaa9a3bbb568719e948d1922bc32f3
- Corrección (una o más: mover de etapa / dejar como informativo / eliminar / ajustar configuración / modificar tests): eliminar las pruebas duplicadas y modificar tests
- Evidencia (dato observado, con link al run o fragmento de la salida local): en el run #2, e2e ejecutó 10 pruebas en 4,3 s pero el job duró 47 s. La instalación de Chromium tomó unos 22 s (21:17:47 a 21:18:10). Link al run: https://github.com/Kiridas/INF384-lab4-dev/actions/runs/40956282764
### Defecto 3 
- Job y etapa: integration, pre-build
- Problema que causa en el pipeline: las pruebas dependen del orden y del estado de una base compartida. Si la base ya existe, fallan aunque el código sea correcto, así que el resultado depende del entorno y no es reproducible.
- Link al commit: https://github.com/Kiridas/INF384-lab4-dev/tree/961f085d59be199336015f8c1837e17f9d3c265c
- Corrección (una o más: mover de etapa / dejar como informativo / eliminar / ajustar configuración / modificar tests): modificar tests (base temporal nueva en cada corrida)
- Evidencia (dato observado, con link al run o fragmento de la salida local): Ejecutando en cmd. test:integration 12 pass. Segunda corrida sobre la misma base: 6 pass, 6 fail ("800 !== 900", "400 !== 200", "2 !== 1").
### Defecto 4 
- Job y etapa: workflow completo (afecta deploy, smoke, e2e y load)
- Problema que causa en el pipeline: los pull requests y main despliegan en la misma función Lambda. Dos runs a la vez pueden pisarse y smoke, e2e o load miden código de otro run. La concurrencia de deploy solo protege a ese job.
- Link al commit: https://github.com/Kiridas/INF384-lab4-dev/tree/84b85d72baa8e46181715ab8cbc5fd700bc23aff
- Corrección (una o más: mover de etapa / dejar como informativo / eliminar / ajustar configuración / modificar tests): ajustar configuración (concurrency a nivel de workflow, un solo run a la vez, sin cancelar)
- Evidencia (dato observado, con link al run o fragmento de la salida local):  el pull request https://github.com/Kiridas/INF384-lab4-dev/pull/1 se abrió a las 17:16 mientras corría el run de main https://github.com/Kiridas/INF384-lab4-dev/actions/runs/40963745134. Su run https://github.com/Kiridas/INF384-lab4-dev/actions/runs/40964573035 esperó casi 8 minutos y su job unit inició a las 22:24:17 UTC, cinco segundos después de que terminó load en main. Sin la corrección ambos runs habrían desplegado a la vez sobre la misma función.
### Defecto 5
- Job y etapa: sca, pre-build
- Problema que causa en el pipeline: analiza también las dependencias de desarrollo, que no se despliegan, y puede detener el pipeline por herramientas de prueba. Lo que sí se despliega (la imagen) no detiene nada.
- Link al commit: https://github.com/Kiridas/INF384-lab4-dev/tree/01a87ebe1677fa4aaead866ad5e27ae577cd3777
- Corrección (una o más: mover de etapa / dejar como informativo / eliminar / ajustar configuración / modificar tests): ajustar configuración (quitar --include-dev-deps)
- Evidencia (dato observado, con link al run o fragmento de la salida local): En mi cmd npm ls --all --parseable da 98 y con --omit=dev da 39, así que 59 de 98 paquetes son solo de desarrollo. En el run https://github.com/Kiridas/INF384-lab4-dev/actions/runs/40956282764 el escaneo informativo de la imagen desplegada reportó 1 CRITICAL y 210 HIGH sin detener el pipeline.

## Parte 2 · Implementación
- Link al run en verde en main: https://github.com/Kiridas/INF384-lab4-dev/actions/runs/40963745134
- Link al pull request: https://github.com/Kiridas/INF384-lab4-dev/pull/1 
- Defecto de la aplicación introducido (archivo y descripción): src/wallet.js, en transferir la comparación del saldo usa <= en vez de <, así que rechaza con 400 "saldo insuficiente" una transferencia por el saldo exacto de la cuenta de origen.
- Job que debería detenerlo: Unit 
- Link al run fallido: https://github.com/Kiridas/INF384-lab4-dev/actions/runs/40964573035

## Parte 3 · Decisión bajo restricción
Link al run medido: https://github.com/Kiridas/INF384-lab4-dev/actions/runs/40963745134
 
| Job | Duración (min:seg) |
|---|---|
| unit | 0:12 |
| integration | 0:10 |
| sast | 0:24 |
| sca | 0:12 |
| build-push | 0:44 |
| deploy | 0:23 |
| smoke | 0:08 |
| e2e | 0:34 |
| load | 12:12 |
| **Total** | 14:59 |
 
Resultado de load en ese run:
| Métrica | Valor |
|---|---|
| p90 | 83,41 ms |
| p95 | 85,33 ms |
| Máximo | 177,63 ms |
| Tasa de error | 0,00 % |
| Requests por segundo | 47,51 |
 
Conclusión sobre el comportamiento bajo carga: con 30 usuarios virtuales durante 12 minutos la API respondió sin errores y con latencia estable. El máximo fue solo el doble del p95, sin picos relevantes de arranque en frío. No se llegó a saturar, así que esta carga no mide el límite del servicio.
 
SLO propuesto (percentil, valor, ventana) y justificación: p95 de latencia menor a 200 ms en una ventana móvil de 28 días, configurado en SLO_P95 de ci.yml. Los p95 que medí fueron 85 ms en el run medido, 71 ms en el primer run y 19,7 ms en el último run (https://github.com/Kiridas/INF384-lab4-dev/actions/runs/40967864750). Los 200 ms son más del doble del peor p95, así que la variación normal entre runs no hace fallar load, y aun así detectan una regresión de más del doble.
 
SLA propuesto y diferencia con el SLO: 95 % de las solicitudes en menos de 500 ms y disponibilidad mensual de 99,5 %, con compensación al cliente si no se cumple. El SLO es una meta interna más exigente que sirve de alerta. El SLA es un compromiso contractual con penalización, por eso es más laxo y deja margen entre la alerta interna y el incumplimiento.
 
Cambios para cumplir el presupuesto:
| Cambio | Job | Minutos recuperados |
|---|---|---|
| Tramo constante de 10 a 4 min y rampas de 1 min a 10 s | load | 7,7 |
| Solo en pull requests y fuera de needs de build-push | sast | 0,4 |
 
Total resultante: [6:48] min
Link al run en main con los cambios: https://github.com/Kiridas/INF384-lab4-dev/actions/runs/40967864750

Riesgo aceptado (defecto concreto de la aplicación y efecto en la métrica DORA asignada): una fuga de memoria en handler.js que guarde cada evento en un arreglo global. Con 30 usuarios y unos 47 requests por segundo el efecto crece con los minutos, y con un tramo de 4 minutos load deja de verlo. Llega a producción y se descubre ahí. El time to restore de ese incidente sube, porque la detección y el diagnóstico pasan a producción. El pipeline más corto recorta unos 8 minutos del redeploy, pero no compensa ese tiempo.

Decisión sobre sast (se queda / se mueve a otra etapa o evento / informativo) y razón: se mueve a otro evento. Corre solo en pull requests y deja de ser requisito de build-push. Cuesta 24 s por run, de los cuales unos 17 s son instalar Semgrep y 2,5 s el escaneo, con 0 hallazgos en 4 archivos. El código ya se revisó en el PR, así que repetirlo en main no aporta. El time to restore baja, porque cada run de main, incluido un hotfix, dura 24 s menos. El riesgo es que un push directo a main no pasa por SAST, y que en un PR sast ya no bloquea su despliegue, solo marca el check en rojo.

## Declaración de uso de IA
Herramientas usadas y para qué:

Se utilizó Claude para consultar sobre la sintaxis de los archivos modificados y la lógica detras del funcionamiento del workflow CI, el prompr principal en el que se basó la conversación fue la explicación del workflow paso a paso para con eso poder distinguir que se debe hacer en cada paso del laboratorio.
