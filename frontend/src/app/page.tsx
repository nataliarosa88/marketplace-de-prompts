import { PromptVaultApp } from "@/components/PromptVaultApp";
import { AuthProvider } from "@/context/AuthContext";
import { PromptProvider } from "@/context/PromptContext";

export default function Home() {
  return (
    <AuthProvider>
      <PromptProvider>
        <PromptVaultApp />
      </PromptProvider>
    </AuthProvider>
  );
}
