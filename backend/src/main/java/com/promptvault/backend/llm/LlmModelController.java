package com.promptvault.backend.llm;

import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/llms")
public class LlmModelController {
  private final LlmModelRepository repository;

  public LlmModelController(LlmModelRepository repository) {
    this.repository = repository;
  }

  public record LlmModelResponse(String id, String name, boolean active) {
    public static LlmModelResponse from(LlmModel model) {
      return new LlmModelResponse(model.getId(), model.getName(), model.isActive());
    }
  }

  @GetMapping
  public List<LlmModelResponse> listActive() {
    return repository.findAllByActiveTrueOrderByNameAsc().stream().map(LlmModelResponse::from).toList();
  }
}
