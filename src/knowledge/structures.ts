/**
 * Estructuras de hook (fuente única de verdad).
 * El Creative Director elige una estructura por pieza y escribe el hook
 * siguiendo su fórmula. El banco `knowledge/hooks.json` da ejemplos reales
 * por estructura; la ingesta (`pnpm knowledge:refresh`) suma más.
 */
export type HookStructureId =
  | "contrarian"
  | "dolor-directo"
  | "resultado-concreto"
  | "pregunta-abierta"
  | "error-comun"
  | "secreto-industria"
  | "antes-despues"
  | "lista-promesa"
  | "historia-personal"
  | "objecion-revertida"
  | "dato-inesperado"
  | "desafio-status-quo";

export type HookStructure = {
  id: HookStructureId;
  label: string;
  description: string;
  formula: string;
};

export const HOOK_STRUCTURES: HookStructure[] = [
  {
    id: "contrarian",
    label: "Contrarian",
    description:
      "Reta la opinión común del nicho con una declaración rotunda. Solo si podés defenderla con argumentos y prueba real.",
    formula: "[Afirmación común] está muerto / es mentira / te hace perder plata",
  },
  {
    id: "dolor-directo",
    label: "Dolor directo",
    description:
      "Nombra el dolor concreto del cliente en segunda persona, con detalles que suenan vividos (no genéricos).",
    formula: "Tu [cosa] [síntoma concreto] y ni siquiera te das cuenta",
  },
  {
    id: "resultado-concreto",
    label: "Resultado concreto",
    description:
      "Arranca con el número o resultado real, sin contexto previo. La curiosidad viene de la cifra.",
    formula: "[Número/resultado] en [tiempo]. Así fue como.",
  },
  {
    id: "pregunta-abierta",
    label: "Pregunta abierta",
    description:
      "Una pregunta que expone un vacío de conocimiento o toca una herida. Mejor si la respuesta es incómoda.",
    formula: "¿Cuánto te cuesta [problema] cada mes que no lo resolvés?",
  },
  {
    id: "error-comun",
    label: "Error común",
    description:
      "Señala un error que la audiencia comete sin saber. Genera autodiagnóstico inmediato.",
    formula: "El error que [audiencia] comete con [tema] — y que te está costando [resultado]",
  },
  {
    id: "secreto-industria",
    label: "Secreto de industria",
    description:
      "Revela algo que se habla poco dentro del gremio. Mezcla de curiosidad + autoridad.",
    formula: "Nadie te cuenta esto sobre [tema]:",
  },
  {
    id: "antes-despues",
    label: "Antes → después",
    description:
      "Contraste explícito entre el estado antes y después. Funciona con pruebas visuales (screenshots).",
    formula: "De [estado malo] a [estado bueno] sin [obstáculo esperado]",
  },
  {
    id: "lista-promesa",
    label: "Lista con promesa",
    description:
      "Promete N puntos concretos. Solo si los puntos tienen sustancia real (prohibida la lista de relleno).",
    formula: "[N] cosas que [audiencia] debería dejar de hacer con [tema]",
  },
  {
    id: "historia-personal",
    label: "Historia personal",
    description:
      "Arranca en escena concreta (hora, lugar, situación). El relato tiene que llegar rápido a la lección.",
    formula: "Era [momento] y [situación límite].",
  },
  {
    id: "objecion-revertida",
    label: "Objeción revertida",
    description:
      "Toma la objeción típica de compra y la da vuelta con lógica o costo de no actuar.",
    formula: '"[Objeción]". Vamos a hablar de por qué eso te sale más caro.',
  },
  {
    id: "dato-inesperado",
    label: "Dato inesperado",
    description:
      "Un dato o ratio que sorprende y obliga a recalcular algo que la audiencia daba por sentado.",
    formula: "El [X]% de [audiencia] hace [A] cuando lo que rinde es [B]",
  },
  {
    id: "desafio-status-quo",
    label: "Desafío al status quo",
    description:
      "Todos hacen X; proponé Y con una razón práctica. Distinto del contrarian: acá proponés acción.",
    formula: "Todos te van a decir que [X]. Hacé [Y] primero.",
  },
];

export const structureById = (id: string): HookStructure | undefined =>
  HOOK_STRUCTURES.find((s) => s.id === id);
