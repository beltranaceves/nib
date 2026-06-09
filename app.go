package main

import (
	"context"
	"fmt"
	"os"
	"path/filepath"

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

func (a *App) CreateProject(folderPath string) (string, error) {
	projectRoot, err := filepath.Abs(folderPath)
	if err != nil {
		return "", err
	}

	info, statErr := os.Stat(projectRoot)
	if statErr == nil && !info.IsDir() {
		return "", fmt.Errorf("%s is not a directory", folderPath)
	}

	if err := os.MkdirAll(projectRoot, 0o755); err != nil {
		return "", err
	}

	a.projectRoot = projectRoot
	return projectRoot, nil
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

func (a *App) MovePath(srcPath, dstPath string) error {
	projectRoot, err := a.requireProjectRoot()
	if err != nil {
		return err
	}
	if err := internal.MoveFile(projectRoot, srcPath, dstPath); err == nil {
		return nil
	}
	return internal.MoveDirectory(projectRoot, srcPath, dstPath)
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
