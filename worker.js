
export default {

    async fetch(request, env) {

        const corsHeaders = {

            "Access-Control-Allow-Origin": "*",

            "Access-Control-Allow-Methods":
                "POST, OPTIONS",

            "Access-Control-Allow-Headers":
                "Content-Type"

        };


        if (request.method === "OPTIONS") {

            return new Response(
                null,
                {
                    headers: corsHeaders
                }
            );

        }


        if (request.method !== "POST") {

            return new Response(

                JSON.stringify({
                    error:
                        "Only POST requests are allowed."
                }),

                {
                    status: 405,

                    headers: {
                        "Content-Type":
                            "application/json",

                        ...corsHeaders
                    }
                }

            );

        }


        try {

            const body =
                await request.json();


            const notes =
                typeof body.notes === "string"
                    ? body.notes.trim()
                    : "";


            const count =
                Math.min(
                    Math.max(
                        Number(body.count) || 10,
                        1
                    ),
                    20
                );


            if (notes.length < 20) {

                return new Response(

                    JSON.stringify({
                        error:
                            "Please provide more notes."
                    }),

                    {
                        status: 400,

                        headers: {
                            "Content-Type":
                                "application/json",

                            ...corsHeaders
                        }
                    }

                );

            }


            if (!env.GEMINI_API_KEY) {

                return new Response(

                    JSON.stringify({
                        error:
                            "Gemini API key is not configured."
                    }),

                    {
                        status: 500,

                        headers: {
                            "Content-Type":
                                "application/json",

                            ...corsHeaders
                        }
                    }

                );

            }


            const prompt = `You are Owly, an educational flashcard generator.

Create exactly ${count} useful flashcards from the student's notes.

IMPORTANT RULES:

1. Only use information contained in the notes.
2. Do not invent facts.
3. Do not add information that is not supported by the notes.
4. Each flashcard should test one clear idea.
5. Questions should be concise.
6. Answers should be concise but complete.
7. Avoid duplicate questions.
8. Make the cards useful for studying.
9. Return ONLY valid JSON.
10. Do not use markdown.
11. Do not put the JSON inside a code block.

Return this exact format:

[
  {
    "question": "Question here",
    "answer": "Answer here"
  }
]

STUDENT NOTES:

${notes}`;


            const geminiResponse =
                await fetch(
                    "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=" +
                    encodeURIComponent(
                        env.GEMINI_API_KEY
                    ),
                    {

                        method: "POST",

                        headers: {
                            "Content-Type":
                                "application/json"
                        },

                        body: JSON.stringify({

                            contents: [

                                {
                                    parts: [

                                        {
                                            text:
                                                prompt
                                        }

                                    ]
                                }

                            ],

                            generationConfig: {

                                temperature:
                                    0.2,

                                responseMimeType:
                                    "application/json"

                            }

                        })

                    }
                );


            const geminiData =
                await geminiResponse.json();


            if (!geminiResponse.ok) {

                console.error(
                    "Gemini error:",
                    geminiData
                );


                return new Response(

                    JSON.stringify({
                        error:
                            "The AI service returned an error."
                    }),

                    {
                        status: 500,

                        headers: {
                            "Content-Type":
                                "application/json",

                            ...corsHeaders
                        }
                    }

                );

            }


            const generatedText =
                geminiData
                    ?.candidates?.[0]
                    ?.content
                    ?.parts?.[0]
                    ?.text;


            if (!generatedText) {

                throw new Error(
                    "Gemini returned no text."
                );

            }


            let flashcards;


            try {

                flashcards =
                    JSON.parse(
                        generatedText
                    );

            } catch (error) {

                console.error(
                    "Invalid JSON from Gemini:",
                    generatedText
                );

                throw new Error(
                    "The AI returned invalid flashcard data."
                );

            }


            if (
                !Array.isArray(
                    flashcards
                )
            ) {

                throw new Error(
                    "The AI response was not a flashcard array."
                );

            }


            flashcards =
                flashcards
                    .filter(card =>
                        card &&
                        typeof card.question === "string" &&
                        typeof card.answer === "string"
                    )
                    .slice(0, count)
                    .map(card => ({

                        question:
                            card.question.trim(),

                        answer:
                            card.answer.trim()

                    }))
                    .filter(card =>
                        card.question &&
                        card.answer
                    );


            return new Response(

                JSON.stringify({

                    flashcards:
                        flashcards

                }),

                {

                    status: 200,

                    headers: {

                        "Content-Type":
                            "application/json",

                        ...corsHeaders

                    }

                }

            );


        } catch (error) {

            console.error(error);


            return new Response(

                JSON.stringify({

                    error:
                        error.message ||
                        "Something went wrong."

                }),

                {

                    status: 500,

                    headers: {

                        "Content-Type":
                            "application/json",

                        ...corsHeaders

                    }

                }

            );

        }

    }

};
