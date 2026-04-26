package com.promptvault.backend.llm;

import java.util.List;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class LlmSeed {
  @Bean
  CommandLineRunner seedLlms(LlmModelRepository repository) {
    return args -> {
      List<String> defaults = List.of("gpt-4o", "gpt-4.1", "claude-sonnet", "gemini-1.5-pro", "llama-3.1");
      for (String name : defaults) {
        if (repository.findByNameIgnoreCase(name).isPresent()) continue;
        LlmModel model = new LlmModel();
        model.setName(name);
        model.setActive(true);
        repository.save(model);
      }
    };
  }
}
