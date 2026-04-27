package com.promptvault.backend.prompt;

import jakarta.persistence.EntityNotFoundException;
import java.time.OffsetDateTime;
import java.util.List;
import org.springframework.stereotype.Service;

@Service
public class PromptService {
  private final PromptRepository repository;

  public PromptService(PromptRepository repository) {
    this.repository = repository;
  }

  public List<PromptResponse> findAll() {
    return repository.findAllByAuthorizedAtIsNotNullAndDeletedAtIsNullOrderByCreatedAtDesc().stream()
        .map(PromptResponse::from)
        .toList();
  }

  public List<PromptResponse> findPending() {
    return repository.findAllByAuthorizedAtIsNullAndDeletedAtIsNullOrderByCreatedAtDesc().stream()
        .map(PromptResponse::from)
        .toList();
  }

  public PromptResponse approve(String id) {
    Prompt prompt = repository.findById(id).orElseThrow(() -> new EntityNotFoundException("Prompt nao encontrado"));
    if (prompt.getDeletedAt() != null) {
      throw new IllegalArgumentException("Prompt ja foi reprovado");
    }
    prompt.setAuthorizedAt(OffsetDateTime.now());
    return PromptResponse.from(repository.save(prompt));
  }

  public PromptResponse reject(String id) {
    Prompt prompt = repository.findById(id).orElseThrow(() -> new EntityNotFoundException("Prompt nao encontrado"));
    if (prompt.getAuthorizedAt() != null) {
      throw new IllegalArgumentException("Prompt ja foi aprovado");
    }
    prompt.setDeletedAt(OffsetDateTime.now());
    return PromptResponse.from(repository.save(prompt));
  }

  public PromptResponse create(PromptRequest request) {
    Prompt prompt = new Prompt();
    apply(request, prompt);
    // sem login: sempre entra como pendente para aprovacao via URL secreta
    prompt.setAuthorizedAt(null);
    prompt.setDeletedAt(null);
    return PromptResponse.from(repository.save(prompt));
  }

  public PromptResponse incrementCopy(String id) {
    Prompt prompt = repository.findById(id).orElseThrow(() -> new EntityNotFoundException("Prompt nao encontrado"));
    if (prompt.getAuthorizedAt() == null || prompt.getDeletedAt() != null) {
      throw new IllegalArgumentException("Prompt nao autorizado");
    }
    prompt.setCopies((prompt.getCopies() == null ? 0 : prompt.getCopies()) + 1);
    return PromptResponse.from(repository.save(prompt));
  }

  private void apply(PromptRequest request, Prompt prompt) {
    prompt.setTitle(request.title().trim());
    prompt.setBody(request.body().trim());
    prompt.setAuthor(request.email().trim().toLowerCase());
    prompt.setTags(request.tags() == null ? List.of() : request.tags().stream().map(String::trim).toList());
    prompt.setModel(request.model() == null ? null : request.model().trim());
    prompt.setDescription(request.desc().trim());
    if (request.copies() != null) {
      prompt.setCopies(Math.max(request.copies(), 0));
    } else if (prompt.getCopies() == null) {
      prompt.setCopies(0);
    }
  }
}
