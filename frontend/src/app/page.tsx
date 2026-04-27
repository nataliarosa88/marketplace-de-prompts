import { PromptVaultApp } from "@/components/PromptVaultApp";
import { PromptProvider } from "@/context/PromptContext";

export default function Home() {
  return (
    <PromptProvider>
      <PromptVaultApp />
    </PromptProvider>
  );
}
