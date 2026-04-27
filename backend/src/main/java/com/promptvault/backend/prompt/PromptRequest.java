package com.promptvault.backend.prompt;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import java.util.List;

public record PromptRequest(
    @NotBlank String title,
    @NotBlank String body,
    @Email @NotBlank String email,
    List<String> tags,
    String model,
    @NotBlank String desc,
    Integer copies
) {}
