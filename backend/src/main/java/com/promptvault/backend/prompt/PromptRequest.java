package com.promptvault.backend.prompt;

import jakarta.validation.constraints.NotBlank;
import java.util.List;

public record PromptRequest(
    @NotBlank String title,
    @NotBlank String body,
    String author,
    List<String> tags,
    String model,
    String desc,
    Integer copies
) {}
