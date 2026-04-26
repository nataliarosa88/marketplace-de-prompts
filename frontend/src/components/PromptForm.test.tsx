import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { PromptForm } from "@/components/PromptForm";

describe("PromptForm", () => {
  it("chama onSave com payload normalizado", async () => {
    const onSave = jest.fn().mockResolvedValue(undefined);
    const onClose = jest.fn();

    render(<PromptForm selectedPrompt={null} onSave={onSave} onClose={onClose} />);

    fireEvent.change(screen.getByLabelText("Titulo"), { target: { value: "Teste" } });
    fireEvent.change(screen.getByLabelText("Prompt"), { target: { value: "Conteudo do prompt" } });
    fireEvent.change(screen.getByLabelText("Tags (separadas por virgula)"), {
      target: { value: "Dev, React" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Salvar" }));

    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));
    expect(onSave).toHaveBeenCalledWith(null, {
      title: "Teste",
      body: "Conteudo do prompt",
      tags: ["dev", "react"],
      model: undefined,
      desc: undefined,
    });
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
