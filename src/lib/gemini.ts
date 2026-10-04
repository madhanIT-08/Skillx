export async function generateGeminiContent(request: {
    model: string;
    contents: unknown;
    config?: unknown;
}): Promise<{ text: string }> {
    const response = await fetch("/api/gemini", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(request),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
        throw new Error(data.error || "Gemini request failed.");
    }

    return data;
}