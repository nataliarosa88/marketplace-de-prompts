package com.promptvault.backend.llm;

import jakarta.persistence.EntityNotFoundException;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import java.util.List;
import com.promptvault.backend.prompt.PromptRepository;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/admin/llms")
@PreAuthorize("hasRole('ADMIN')")
public class AdminLlmController {
  private final LlmModelRepository repository;
  private final PromptRepository promptRepository;

  public AdminLlmController(LlmModelRepository repository, PromptRepository promptRepository) {
    this.repository = repository;
    this.promptRepository = promptRepository;
  }

  public record LlmModelResponse(String id, String name, boolean active) {
    public static LlmModelResponse from(LlmModel model) {
      return new LlmModelResponse(model.getId(), model.getName(), model.isActive());
    }
  }

  public record CreateLlmRequest(@NotBlank String name) {}
  public record DeleteLlmResponse(String id, String name, boolean active, boolean deleted) {}

  @GetMapping
  public List<LlmModelResponse> listAll() {
    return repository.findAllByOrderByNameAsc().stream().map(LlmModelResponse::from).toList();
  }

  @PostMapping
  public LlmModelResponse create(@RequestBody @Valid CreateLlmRequest request) {
    String normalizedName = request.name().trim();
    LlmModel existing = repository.findByNameIgnoreCase(normalizedName).orElse(null);
    if (existing != null) {
      if (!existing.isActive()) {
        existing.setActive(true);
        return LlmModelResponse.from(repository.save(existing));
      }
      throw new IllegalArgumentException("LLM ja cadastrada");
    }

    LlmModel model = new LlmModel();
    model.setName(normalizedName);
    model.setActive(true);
    return LlmModelResponse.from(repository.save(model));
  }

  @DeleteMapping("/{id}")
  public DeleteLlmResponse delete(@PathVariable String id) {
    LlmModel model = repository.findById(id).orElseThrow(() -> new EntityNotFoundException("LLM nao encontrada"));
    boolean wasUsed = promptRepository.existsByModelIgnoreCase(model.getName());
    if (wasUsed) {
      model.setActive(false);
      LlmModel saved = repository.save(model);
      return new DeleteLlmResponse(saved.getId(), saved.getName(), saved.isActive(), false);
    }
    repository.delete(model);
    return new DeleteLlmResponse(model.getId(), model.getName(), false, true);
  }
}
