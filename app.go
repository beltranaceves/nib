package main

import (
	"context"
	"fmt"
	"os"

	"nib/internal"

	"github.com/wailsapp/wails/v2/pkg/runtime"
)

// App struct
type App struct {
	ctx         context.Context
	projectRoot string
}

// NewApp creates a new App application struct
func NewApp() *App {
	return &App{}
}

// startup is called when the app starts. The context is saved
// so we can call the runtime methods
func (a *App) startup(ctx context.Context) {
	a.ctx = ctx
}

func (a *App) OpenProject(folderPath string) (string, error) {
	projectRoot, err := internal.OpenProject(folderPath)
	if err != nil {
		return "", err
	}
	a.projectRoot = projectRoot
	return projectRoot, nil
}

func (a *App) PickProjectFolder(title string) (string, error) {
	defaultDirectory := a.projectRoot
	if defaultDirectory == "" {
		if homeDirectory, err := os.UserHomeDir(); err == nil {
			defaultDirectory = homeDirectory
		}
	}

	selectedPath, err := runtime.OpenDirectoryDialog(a.ctx, runtime.OpenDialogOptions{
		Title:                      title,
		DefaultDirectory:           defaultDirectory,
		CanCreateDirectories:       true,
		TreatPackagesAsDirectories: true,
	})
	if err != nil {
		return "", err
	}

	return selectedPath, nil
}

func (a *App) ListEntries(path string) ([]internal.Entry, error) {
	projectRoot, err := a.requireProjectRoot()
	if err != nil {
		return nil, err
	}
	return internal.ListEntries(projectRoot, path)
}

func (a *App) ReadFile(path string) (string, error) {
	projectRoot, err := a.requireProjectRoot()
	if err != nil {
		return "", err
	}
	data, err := internal.ReadFile(projectRoot, path)
	if err != nil {
		return "", err
	}
	return string(data), nil
}

func (a *App) WriteFile(path string, content string) error {
	projectRoot, err := a.requireProjectRoot()
	if err != nil {
		return err
	}
	return internal.WriteFile(projectRoot, path, []byte(content))
}

func (a *App) CreateFile(path string) error {
	projectRoot, err := a.requireProjectRoot()
	if err != nil {
		return err
	}
	return internal.CreateFile(projectRoot, path)
}

func (a *App) CreateDirectory(path string) error {
	projectRoot, err := a.requireProjectRoot()
	if err != nil {
		return err
	}
	return internal.CreateDirectory(projectRoot, path)
}

func (a *App) DeletePath(path string) error {
	projectRoot, err := a.requireProjectRoot()
	if err != nil {
		return err
	}
	deleteErr := internal.DeleteFile(projectRoot, path)
	if deleteErr == nil {
		return nil
	}
	return internal.DeleteDirectory(projectRoot, path)
}

func (a *App) RenamePath(oldPath, newPath string) error {
	projectRoot, err := a.requireProjectRoot()
	if err != nil {
		return err
	}
	if err := internal.RenameFile(projectRoot, oldPath, newPath); err == nil {
		return nil
	}
	return internal.RenameDirectory(projectRoot, oldPath, newPath)
}

// ── Frontmatter bindings ──

func (a *App) ReadFrontmatter(path string) (*internal.FrontmatterWithBody, error) {
	projectRoot, err := a.requireProjectRoot()
	if err != nil {
		return nil, err
	}
	return internal.ParseFrontmatterFileWithBody(projectRoot, path)
}

func (a *App) WriteFrontmatter(path string, data *internal.FrontmatterData, body string) error {
	projectRoot, err := a.requireProjectRoot()
	if err != nil {
		return err
	}
	return internal.WriteFrontmatterFile(projectRoot, path, data, body)
}

func (a *App) AddSnippet(path string, snippet string) error {
	projectRoot, err := a.requireProjectRoot()
	if err != nil {
		return err
	}
	return internal.AddSnippetToFile(projectRoot, path, snippet)
}

func (a *App) RemoveSnippet(path string, index int) error {
	projectRoot, err := a.requireProjectRoot()
	if err != nil {
		return err
	}
	return internal.RemoveSnippetFromFile(projectRoot, path, index)
}

func (a *App) UpdateSnippet(path string, index int, snippet string) error {
	projectRoot, err := a.requireProjectRoot()
	if err != nil {
		return err
	}
	return internal.UpdateSnippetInFile(projectRoot, path, index, snippet)
}

func (a *App) Greet(name string) string {
	return fmt.Sprintf("Hello %s, It's show time!", name)
}

func (a *App) requireProjectRoot() (string, error) {
	if a.projectRoot == "" {
		return "", fmt.Errorf("open a project folder first")
	}
	return a.projectRoot, nil
}
