import { MermaidDiagram } from '@/components/MermaidDiagram';

const UPLOAD_FLOWCHART = `
flowchart TD
    START(["Usuario (miembro de 'Sócrates')<br/>entra al espacio 'Ética'"]) --> UPLOAD_UI["Panel de Fuentes RAG<br/>(pestaña 'Fuentes' del espacio)"]

    UPLOAD_UI --> PICK["Sube su material de estudio:<br/>apuntes.pdf / notas.txt / resumen.md"]

    PICK --> INGEST["ingest-source (edge function)"]

    subgraph INGEST_FLOW["Procesamiento RAG del material"]
        direction TB
        I1["Valida membresía del usuario<br/>en academy_members de Sócrates"]
        I2["Chunking del documento<br/>(fragmentos de ~500 tokens)"]
        I3["getEmbedding() por cada fragmento<br/>(mismo modelo que usa el oráculo)"]
        I4["INSERT en corpus_fragments:<br/>academy_id='Sócrates'<br/>space_id='Ética'<br/>source_type='user_upload'<br/>uploaded_by=user_id"]
        I1 --> I2 --> I3 --> I4
    end

    INGEST --> INGEST_FLOW
    INGEST_FLOW --> STATUS["UI actualiza estado:<br/>'procesando' → 'procesada'<br/>(badge visible en la lista de fuentes)"]

    STATUS --> NOTIFY["El material queda disponible<br/>para CUALQUIER consulta futura<br/>en el espacio 'Ética' de Sócrates"]

    NOTIFY --> DIRECTOR_ENTERS["La dirección de Sócrates<br/>(owner/admin de esa academia)<br/>entra a revisar el material subido"]

    DIRECTOR_ENTERS --> CONV_MODE["Abre modo conversacional<br/>sobre esa fuente concreta<br/>(no el oráculo socrático del estudiante,<br/>una vista de análisis para la dirección)"]

    subgraph CONVERSATION["Análisis conversacional del material"]
        direction TB
        C1["Dirección pregunta:<br/>'¿de qué trata este apunte?<br/>¿qué tensión ética plantea?'"]
        C2["ai-curate-text / ai-dialogue-summary<br/>genera embedding de la pregunta"]
        C3["match_corpus_fragments filtrado por<br/>ESE source_file concreto<br/>+ space_id='Ética'"]
        C4["IA responde citando el fragmento<br/>real recuperado, no una alucinación"]
        C5["Dirección repregunta:<br/>'¿qué preguntas socráticas<br/>podrían generarse de esto?'"]
        C6["El sistema sugiere posibles<br/>socratic_questions derivadas,<br/>listas para aprobar y publicar"]
        C1 --> C2 --> C3 --> C4 --> C5 --> C6
    end

    CONV_MODE --> CONVERSATION

    CONVERSATION --> DECISION{"¿La dirección aprueba<br/>el material y las preguntas<br/>sugeridas?"}

    DECISION -->|Sí| PUBLISH["Fragmento queda marcado<br/>status='active'<br/>Preguntas sugeridas se insertan<br/>en socratic_questions del espacio"]
    DECISION -->|No, necesita ajuste| REJECT["Fragmento queda<br/>status='pending'<br/>o se solicita re-subir"]

    PUBLISH --> IMPACT["A partir de ahora, CUALQUIER<br/>estudiante que pregunte al oráculo<br/>sobre 'Ética' puede recibir contexto<br/>de este material aprobado"]

    style INGEST_FLOW fill:#534AB7,color:#fff
    style CONVERSATION fill:#1D9E75,color:#fff
    style DECISION fill:#B7541D,color:#fff
    style IMPACT fill:#B7541D,color:#fff
`;

export default function FlowchartTest() {
  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold mb-6 text-gray-900">
          Test: Flowchart de Upload RAG
        </h1>
        <p className="text-gray-600 mb-8">
          Verificación del diagrama Mermaid para el flujo de subida de material RAG.
        </p>
        
        <div className="bg-white rounded-lg shadow-lg p-6">
          <MermaidDiagram chart={UPLOAD_FLOWCHART} id="upload-rag-flow" />
        </div>

        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h2 className="text-lg font-semibold text-blue-800 mb-2">✅ Estado</h2>
          <p className="text-blue-700">
            Componente Mermaid creado y renderizado correctamente.
          </p>
        </div>
      </div>
    </div>
  );
}
