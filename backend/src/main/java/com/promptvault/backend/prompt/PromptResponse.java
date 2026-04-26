package com.promptvault.backend.prompt;

import java.time.OffsetDateTime;
import java.util.List;

public record PromptResponse(
    String id,
    String title,
    String body,
    String author,
    List<String> tags,
    String model,
    String desc,
    Integer copies,
    Long created,
    Long updated,
    Long authorized,
    Long deleted,
    OffsetDateTime createdAt,
    OffsetDateTime updatedAt
) {
  public static PromptResponse from(Prompt prompt) {
    return new PromptResponse(
        prompt.getId(),
        prompt.getTitle(),
        prompt.getBody(),
        prompt.getAuthor(),
        prompt.getTags(),
        prompt.getModel(),
        prompt.getDescription(),
        prompt.getCopies(),
        prompt.getCreatedAt() == null ? null : prompt.getCreatedAt().toInstant().toEpochMilli(),
        prompt.getUpdatedAt() == null ? null : prompt.getUpdatedAt().toInstant().toEpochMilli(),
        prompt.getAuthorizedAt() == null ? null : prompt.getAuthorizedAt().toInstant().toEpochMilli(),
        prompt.getDeletedAt() == null ? null : prompt.getDeletedAt().toInstant().toEpochMilli(),
        prompt.getCreatedAt(),
        prompt.getUpdatedAt());
  }
}
