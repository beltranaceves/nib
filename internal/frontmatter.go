package internal

import (
	"bytes"
	"fmt"
	"os"
	"path/filepath"
	"strings"

	"gopkg.in/yaml.v3"
)

// FrontmatterData represents the YAML frontmatter fields.
// Fields tagged with yaml for serialization and json for Wails.
type FrontmatterData struct {
	Title    string   `yaml:"title,omitempty" json:"title,omitempty"`
	Snippets []string `yaml:"snippets,omitempty" json:"snippets,omitempty"`
	Tags     []string `yaml:"tags,omitempty" json:"tags,omitempty"`
}

// FrontmatterWithBody combines parsed frontmatter with the body text.
// Used by Wails bindings to return both in a single call.
type FrontmatterWithBody struct {
	Frontmatter *FrontmatterData `json:"frontmatter"`
	Body        string           `json:"body"`
}

// ParseFrontmatterFileWithBody is like ParseFrontmatterFile but wraps
// the result in a FrontmatterWithBody struct for Wails bindings.
func ParseFrontmatterFileWithBody(rootPath, filePath string) (*FrontmatterWithBody, error) {
	fm, body, err := ParseFrontmatterFile(rootPath, filePath)
	if err != nil {
		return nil, err
	}
	return &FrontmatterWithBody{Frontmatter: fm, Body: body}, nil
}

// ParseFrontmatterFile reads a file and parses its YAML frontmatter.
// Returns the parsed frontmatter data, the body text (everything after frontmatter),
// and any error encountered.
//
// The file is expected to have the format:
//
//	---
//	title: My Essay
//	snippets:
//	  - First snippet
//	  - Second snippet
//	---
//	Body content starts here...
//
// Files without frontmatter delimiters are handled gracefully: an empty
// FrontmatterData is returned along with the full file content as body.
func ParseFrontmatterFile(rootPath, filePath string) (*FrontmatterData, string, error) {
	securePath, err := resolvePath(rootPath, filePath)
	if err != nil {
		return nil, "", err
	}

	data, err := os.ReadFile(securePath)
	if err != nil {
		return nil, "", err
	}

	content := string(data)
	fm, body := splitFrontmatter(content)
	return fm, body, nil
}

// splitFrontmatter splits raw file content into frontmatter and body.
func splitFrontmatter(content string) (*FrontmatterData, string) {
	content = strings.TrimSpace(content)

	// Must start with ---
	if !strings.HasPrefix(content, "---") {
		return &FrontmatterData{}, content
	}

	// Find the closing ---
	rest := content[3:]
	closingIdx := strings.Index(rest, "\n---")
	if closingIdx == -1 {
		// No closing delimiter — treat the whole file as body
		return &FrontmatterData{}, content
	}

	yamlPart := strings.TrimSpace(rest[:closingIdx])
	body := strings.TrimSpace(rest[closingIdx+4:])

	if yamlPart == "" {
		return &FrontmatterData{}, body
	}

	var fm FrontmatterData
	decoder := yaml.NewDecoder(bytes.NewReader([]byte(yamlPart)))
	decoder.KnownFields(true)
	if err := decoder.Decode(&fm); err != nil {
		// If we can't parse frontmatter, treat it as body content
		return &FrontmatterData{}, content
	}

	// Ensure slices are non-nil for consistent JSON serialization
	if fm.Snippets == nil {
		fm.Snippets = []string{}
	}
	if fm.Tags == nil {
		fm.Tags = []string{}
	}

	return &fm, body
}

// WriteFrontmatterFile writes frontmatter + body to a file.
// If the frontmatter data is empty (no title, no snippets, no tags), only the
// body is written (no frontmatter block is created).
func WriteFrontmatterFile(rootPath, filePath string, fm *FrontmatterData, body string) error {
	securePath, err := resolvePath(rootPath, filePath)
	if err != nil {
		return err
	}

	if err := os.MkdirAll(filepath.Dir(securePath), 0o755); err != nil {
		return err
	}

	// Ensure slices are non-nil for consistent YAML output
	if fm.Snippets == nil {
		fm.Snippets = []string{}
	}
	if fm.Tags == nil {
		fm.Tags = []string{}
	}

	var output strings.Builder

	// Only write frontmatter if there's meaningful data
	if fm.Title != "" || len(fm.Snippets) > 0 || len(fm.Tags) > 0 {
		output.WriteString("---\n")

		yamlData, err := yaml.Marshal(fm)
		if err != nil {
			return fmt.Errorf("failed to marshal frontmatter: %w", err)
		}

		output.WriteString(string(yamlData))
		output.WriteString("---\n")
	}

	output.WriteString(strings.TrimSpace(body))
	output.WriteString("\n")

	return os.WriteFile(securePath, []byte(output.String()), 0o644)
}

// AddSnippetToFile reads a file, appends a snippet to its frontmatter, and writes it back.
func AddSnippetToFile(rootPath, filePath string, snippet string) error {
	fm, body, err := ParseFrontmatterFile(rootPath, filePath)
	if err != nil {
		return err
	}

	fm.Snippets = append(fm.Snippets, snippet)
	return WriteFrontmatterFile(rootPath, filePath, fm, body)
}

// RemoveSnippetFromFile reads a file, removes the snippet at the given index, and writes it back.
// Returns an error if the index is out of bounds.
func RemoveSnippetFromFile(rootPath, filePath string, index int) error {
	fm, body, err := ParseFrontmatterFile(rootPath, filePath)
	if err != nil {
		return err
	}

	if index < 0 || index >= len(fm.Snippets) {
		return fmt.Errorf("snippet index %d out of bounds (snippets length: %d)", index, len(fm.Snippets))
	}

	fm.Snippets = append(fm.Snippets[:index], fm.Snippets[index+1:]...)
	return WriteFrontmatterFile(rootPath, filePath, fm, body)
}

// UpdateSnippetInFile reads a file, updates the snippet at the given index, and writes it back.
// Returns an error if the index is out of bounds.
func UpdateSnippetInFile(rootPath, filePath string, index int, snippet string) error {
	fm, body, err := ParseFrontmatterFile(rootPath, filePath)
	if err != nil {
		return err
	}

	if index < 0 || index >= len(fm.Snippets) {
		return fmt.Errorf("snippet index %d out of bounds (snippets length: %d)", index, len(fm.Snippets))
	}

	fm.Snippets[index] = snippet
	return WriteFrontmatterFile(rootPath, filePath, fm, body)
}
