package main

import (
	"context"
	"fmt"
	"os"
	"runtime"
	"strconv"
	"strings"
	"time"

	"nib/internal"

	wailsRuntime "github.com/wailsapp/wails/v2/pkg/runtime"
)

// App struct
type App struct {
	ctx            context.Context
	projectRoot    string
	startTime      time.Time
	startupDone    time.Time
	prevCPUTime    uint64
	prevSampleTime time.Time
}

// NewApp creates a new App application struct
func NewApp() *App {
	return &App{
		startTime: time.Now(),
	}
}

// startup is called when the app starts. The context is saved
// so we can call the runtime methods
func (a *App) startup(ctx context.Context) {
	a.ctx = ctx
	a.startupDone = time.Now()
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

	selectedPath, err := wailsRuntime.OpenDirectoryDialog(a.ctx, wailsRuntime.OpenDialogOptions{
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

// ProcessStats holds runtime metrics about the app process.
type ProcessStats struct {
	MemoryMB    float64 `json:"memoryMB"`
	Uptime      string  `json:"uptime"`
	CPULoad     float64 `json:"cpuLoad"`
	StartupTime string  `json:"startupTime"`
}

// GetProcessStats returns the current process statistics (memory, uptime, CPU load, startup time).
func (a *App) GetProcessStats() ProcessStats {
	var m runtime.MemStats
	runtime.ReadMemStats(&m)
	memMB := float64(m.Alloc) / 1024 / 1024

	uptime := time.Since(a.startTime)
	startupDuration := a.startupDone.Sub(a.startTime)

	// Calculate CPU load over the sampling interval (5s polling)
	totalJiffies := readProcessTotalCPUJiffies()
	cpuLoad := 0.0
	now := time.Now()
	if a.prevCPUTime > 0 && !a.prevSampleTime.IsZero() {
		elapsedJiffies := totalJiffies - a.prevCPUTime
		elapsedTime := now.Sub(a.prevSampleTime)
		if elapsedTime > 0 {
			// CLK_TCK is typically 100 on Linux
			cpuSeconds := float64(elapsedJiffies) / 100.0
			wallSeconds := elapsedTime.Seconds()
			cpuLoad = (cpuSeconds / wallSeconds) * 100.0
		}
	}
	a.prevCPUTime = totalJiffies
	a.prevSampleTime = now

	return ProcessStats{
		MemoryMB:    memMB,
		Uptime:      fmtDuration(uptime),
		CPULoad:     cpuLoad,
		StartupTime: fmtDuration(startupDuration),
	}
}

// fmtDuration formats a duration in a concise human-readable form.
func fmtDuration(d time.Duration) string {
	d = d.Round(time.Second)
	if d < time.Minute {
		return fmt.Sprintf("%ds", int(d.Seconds()))
	}
	if d < time.Hour {
		return fmt.Sprintf("%dm %ds", int(d.Minutes()), int(d.Seconds())%60)
	}
	if d < 24*time.Hour {
		return fmt.Sprintf("%dh %dm", int(d.Hours()), int(d.Minutes())%60)
	}
	return fmt.Sprintf("%dd %dh", int(d.Hours()/24), int(d.Hours())%24)
}

// readProcessTotalCPUJiffies reads the cumulative CPU jiffies (user + system) from /proc/self/stat.
// Returns 0 if the file can't be read (e.g. on non-Linux systems).
func readProcessTotalCPUJiffies() uint64 {
	data, err := os.ReadFile("/proc/self/stat")
	if err != nil {
		return 0
	}
	content := string(data)
	rparen := strings.LastIndex(content, ")")
	if rparen == -1 {
		return 0
	}
	fields := strings.Fields(content[rparen+1:])
	// fields[11] = utime, fields[12] = stime (0-indexed after state)
	if len(fields) < 13 {
		return 0
	}
	utime, _ := strconv.ParseUint(fields[11], 10, 64)
	stime, _ := strconv.ParseUint(fields[12], 10, 64)
	return utime + stime
}

func (a *App) requireProjectRoot() (string, error) {
	if a.projectRoot == "" {
		return "", fmt.Errorf("open a project folder first")
	}
	return a.projectRoot, nil
}
