export interface AiCompletionInput {
  systemPrompt: string;
  messages?: Array<{
    role: "user" | "assistant";
    content: string;
  }>;
  userPrompt: string;
}

interface OllamaMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export async function generateAiReply(
  baseUrl: string,
  model: string,
  input: AiCompletionInput
): Promise<string> {
  if (!model) {
    return "OLLAMA_MODEL n'est pas configure dans .env.";
  }

  const messages: OllamaMessage[] = [
    {
      role: "system",
      content: input.systemPrompt
    },
    ...(input.messages?.map((message) => ({
      role: message.role,
      content: message.content
    })) ?? []),
    {
      role: "user",
      content: input.userPrompt
    }
  ];

  let response: Response;

  try {
    response = await fetch(`${baseUrl}/api/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model,
        messages,
        stream: false
      })
    });
  } catch {
    return `Ollama est inaccessible. Lance Ollama puis verifie ${baseUrl}.`;
  }

  if (!response.ok) {
    const errorText = await response.text();
    if (response.status === 404 && errorText.includes("not found")) {
      return `Le modele Ollama \`${model}\` est introuvable. Lance \`ollama pull ${model}\` puis redemarre le bot.`;
    }
    return `Erreur Ollama ${response.status}: ${errorText.slice(0, 300)}`;
  }

  const data = (await response.json()) as {
    message?: {
      content?: string;
    };
  };

  return data.message?.content?.trim() || "Aucune reponse generee.";
}
