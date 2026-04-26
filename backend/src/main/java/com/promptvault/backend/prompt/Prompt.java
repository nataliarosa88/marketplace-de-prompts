package com.promptvault.backend.prompt;

import jakarta.persistence.Column;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "prompts")
public class Prompt {
  @Id
  @GeneratedValue(strategy = GenerationType.UUID)
  private String id;

  @Column(nullable = false)
  private String title;

  @Column(nullable = false, columnDefinition = "TEXT")
  private String body;

  @Column(nullable = false)
  private String author;

  @ElementCollection(fetch = FetchType.EAGER)
  private List<String> tags = new ArrayList<>();

  private String model;

  private String description;

  @Column(nullable = false)
  private Integer copies = 0;

  @Column(nullable = false)
  private OffsetDateTime createdAt;

  private OffsetDateTime updatedAt;

  // moderation
  private OffsetDateTime authorizedAt;

  // soft delete (reprovado/oculto)
  private OffsetDateTime deletedAt;

  @PrePersist
  public void prePersist() {
    this.createdAt = OffsetDateTime.now();
  }

  @PreUpdate
  public void preUpdate() {
    this.updatedAt = OffsetDateTime.now();
  }

  public String getId() {
    return id;
  }

  public String getTitle() {
    return title;
  }

  public void setTitle(String title) {
    this.title = title;
  }

  public String getBody() {
    return body;
  }

  public void setBody(String body) {
    this.body = body;
  }

  public String getAuthor() {
    return author;
  }

  public void setAuthor(String author) {
    this.author = author;
  }

  public List<String> getTags() {
    return tags;
  }

  public void setTags(List<String> tags) {
    this.tags = tags;
  }

  public String getModel() {
    return model;
  }

  public void setModel(String model) {
    this.model = model;
  }

  public String getDescription() {
    return description;
  }

  public void setDescription(String description) {
    this.description = description;
  }

  public Integer getCopies() {
    return copies;
  }

  public void setCopies(Integer copies) {
    this.copies = copies;
  }

  public OffsetDateTime getCreatedAt() {
    return createdAt;
  }

  public OffsetDateTime getUpdatedAt() {
    return updatedAt;
  }

  public OffsetDateTime getAuthorizedAt() {
    return authorizedAt;
  }

  public void setAuthorizedAt(OffsetDateTime authorizedAt) {
    this.authorizedAt = authorizedAt;
  }

  public OffsetDateTime getDeletedAt() {
    return deletedAt;
  }

  public void setDeletedAt(OffsetDateTime deletedAt) {
    this.deletedAt = deletedAt;
  }
}
