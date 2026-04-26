package com.promptvault.backend.prompt;

import jakarta.persistence.EntityNotFoundException;
import java.time.OffsetDateTime;
import java.util.List;
import org.springframework.security.access.AccessDeniedException;
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
    return create(request, false, request.author());
  }

  public PromptResponse create(PromptRequest request, boolean autoApprove, String fallbackAuthor) {
    Prompt prompt = new Prompt();
    apply(request, prompt, fallbackAuthor);
    prompt.setAuthorizedAt(autoApprove ? OffsetDateTime.now() : null);
    prompt.setDeletedAt(null);
    return PromptResponse.from(repository.save(prompt));
  }

  public PromptResponse update(String id, PromptRequest request) {
    return update(id, request, null, true);
  }

  public PromptResponse update(String id, PromptRequest request, String actorEmail, boolean isAdmin) {
    Prompt prompt = repository.findById(id).orElseThrow(() -> new EntityNotFoundException("Prompt nao encontrado"));
    if (prompt.getDeletedAt() != null) {
      throw new IllegalArgumentException("Prompt reprovado nao pode ser editado");
    }
    ensureOwnerOrAdmin(prompt, actorEmail, isAdmin);
    apply(request, prompt, prompt.getAuthor());
    return PromptResponse.from(repository.save(prompt));
  }

  public void delete(String id) {
    delete(id, null, true);
  }

  public void delete(String id, String actorEmail, boolean isAdmin) {
    Prompt prompt = repository.findById(id).orElseThrow(() -> new EntityNotFoundException("Prompt nao encontrado"));
    ensureOwnerOrAdmin(prompt, actorEmail, isAdmin);
    repository.deleteById(id);
  }

  private void ensureOwnerOrAdmin(Prompt prompt, String actorEmail, boolean isAdmin) {
    if (isAdmin) {
      return;
    }
    if (actorEmail == null || actorEmail.isBlank()) {
      throw new AccessDeniedException("Sem permissao para alterar este prompt");
    }
    String promptAuthor = prompt.getAuthor() == null ? "" : prompt.getAuthor().trim();
    if (!promptAuthor.equalsIgnoreCase(actorEmail.trim())) {
      throw new AccessDeniedException("Apenas o autor pode alterar este prompt");
    }
  }

  public PromptResponse incrementCopy(String id) {
    Prompt prompt = repository.findById(id).orElseThrow(() -> new EntityNotFoundException("Prompt nao encontrado"));
    if (prompt.getAuthorizedAt() == null || prompt.getDeletedAt() != null) {
      throw new IllegalArgumentException("Prompt nao autorizado");
    }
    prompt.setCopies((prompt.getCopies() == null ? 0 : prompt.getCopies()) + 1);
    return PromptResponse.from(repository.save(prompt));
  }

  private void apply(PromptRequest request, Prompt prompt, String fallbackAuthor) {
    prompt.setTitle(request.title().trim());
    prompt.setBody(request.body().trim());
    String author = fallbackAuthor == null ? "" : fallbackAuthor.trim();
    prompt.setAuthor(author.isBlank() ? "unknown" : author);
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
