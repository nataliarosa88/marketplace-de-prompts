package com.promptvault.backend.config;

import jakarta.persistence.EntityNotFoundException;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.server.ResponseStatusException;

@RestControllerAdvice
public class ApiExceptionHandler {
  @ExceptionHandler(EntityNotFoundException.class)
  @ResponseStatus(HttpStatus.NOT_FOUND)
  public Map<String, String> handleNotFound(EntityNotFoundException exception) {
    return Map.of("message", exception.getMessage());
  }

  @ExceptionHandler(MethodArgumentNotValidException.class)
  @ResponseStatus(HttpStatus.BAD_REQUEST)
  public Map<String, String> handleValidation() {
    return Map.of("message", "Dados invalidos");
  }

  @ExceptionHandler(IllegalArgumentException.class)
  @ResponseStatus(HttpStatus.BAD_REQUEST)
  public Map<String, String> handleBadRequest(IllegalArgumentException exception) {
    return Map.of("message", exception.getMessage());
  }

  @ExceptionHandler(ResponseStatusException.class)
  public Map<String, String> handleStatus(ResponseStatusException exception) {
    return Map.of("message", exception.getReason() == null ? "Erro" : exception.getReason());
  }
}
