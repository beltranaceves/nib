package internal

import (
	"fmt"
	"os"
	"path/filepath"
	"sort"
	"strings"
)

type Entry struct {
	Name  string `json:"name"`
	Path  string `json:"path"`
	IsDir bool   `json:"isDir"`
	Size  int64  `json:"size"`
}

func OpenProject(folderPath string) (string, error) {
	securePath, err := filepath.Abs(folderPath)
	if err != nil {
		return "", err
	}
	info, err := os.Stat(securePath)
	if err != nil {
		return "", err
	}
	if !info.IsDir() {
		return "", fmt.Errorf("%s is not a directory", folderPath)
	}
	return securePath, nil
}

func ListEntries(rootPath, folderPath string) ([]Entry, error) {
	securePath, err := resolvePath(rootPath, folderPath)
	if err != nil {
		return nil, err
	}
	entries, err := os.ReadDir(securePath)
	if err != nil {
		return nil, err
	}

	result := make([]Entry, 0, len(entries))
	for _, entry := range entries {
		info, err := entry.Info()
		if err != nil {
			return nil, err
		}

		entryPath := filepath.Join(securePath, entry.Name())
		relativePath, err := filepath.Rel(rootPath, entryPath)
		if err != nil {
			return nil, err
		}

		result = append(result, Entry{
			Name:  entry.Name(),
			Path:  filepath.ToSlash(relativePath),
			IsDir: entry.IsDir(),
			Size:  info.Size(),
		})
	}

	sort.Slice(result, func(i, j int) bool {
		if result[i].IsDir != result[j].IsDir {
			return result[i].IsDir
		}
		return strings.ToLower(result[i].Name) < strings.ToLower(result[j].Name)
	})

	return result, nil
}

func ReadFile(rootPath, filePath string) ([]byte, error) {
	securePath, err := resolvePath(rootPath, filePath)
	if err != nil {
		return nil, err
	}
	return os.ReadFile(securePath)
}

func WriteFile(rootPath, filePath string, data []byte) error {
	securePath, err := resolvePath(rootPath, filePath)
	if err != nil {
		return err
	}
	if err := os.MkdirAll(filepath.Dir(securePath), 0o755); err != nil {
		return err
	}
	return os.WriteFile(securePath, data, 0o644)
}

func CreateFile(rootPath, filePath string) error {
	securePath, err := resolvePath(rootPath, filePath)
	if err != nil {
		return err
	}
	if err := os.MkdirAll(filepath.Dir(securePath), 0o755); err != nil {
		return err
	}
	file, err := os.OpenFile(securePath, os.O_CREATE|os.O_EXCL|os.O_WRONLY, 0o644)
	if err != nil {
		return err
	}
	return file.Close()
}

func DeleteFile(rootPath, filePath string) error {
	securePath, err := resolvePath(rootPath, filePath)
	if err != nil {
		return err
	}
	return os.Remove(securePath)
}

func CreateDirectory(rootPath, dirPath string) error {
	securePath, err := resolvePath(rootPath, dirPath)
	if err != nil {
		return err
	}
	return os.MkdirAll(securePath, 0o755)
}

func DeleteDirectory(rootPath, dirPath string) error {
	securePath, err := resolvePath(rootPath, dirPath)
	if err != nil {
		return err
	}
	return os.RemoveAll(securePath)
}

func RenameFile(rootPath, oldPath, newPath string) error {
	secureOldPath, err := resolvePath(rootPath, oldPath)
	if err != nil {
		return err
	}
	secureNewPath, err := resolvePathAllowMissing(rootPath, newPath)
	if err != nil {
		return err
	}
	if err := os.MkdirAll(filepath.Dir(secureNewPath), 0o755); err != nil {
		return err
	}
	return os.Rename(secureOldPath, secureNewPath)
}

func RenameDirectory(rootPath, oldPath, newPath string) error {
	secureOldPath, err := resolvePath(rootPath, oldPath)
	if err != nil {
		return err
	}
	secureNewPath, err := resolvePathAllowMissing(rootPath, newPath)
	if err != nil {
		return err
	}
	if err := os.MkdirAll(filepath.Dir(secureNewPath), 0o755); err != nil {
		return err
	}
	return os.Rename(secureOldPath, secureNewPath)
}

func MoveFile(rootPath, srcPath, dstPath string) error {
	return RenameFile(rootPath, srcPath, dstPath)
}

func MoveDirectory(rootPath, srcPath, dstPath string) error {
	return RenameDirectory(rootPath, srcPath, dstPath)
}

func resolvePath(rootPath, targetPath string) (string, error) {
	rootAbs, err := filepath.Abs(rootPath)
	if err != nil {
		return "", err
	}
	if targetPath == "" {
		return rootAbs, nil
	}
	joinedPath := filepath.Join(rootAbs, targetPath)
	securePath, err := filepath.Abs(joinedPath)
	if err != nil {
		return "", err
	}
	relativePath, err := filepath.Rel(rootAbs, securePath)
	if err != nil {
		return "", err
	}
	if relativePath == ".." || strings.HasPrefix(relativePath, ".."+string(filepath.Separator)) {
		return "", fmt.Errorf("path escapes project root: %s", targetPath)
	}
	return securePath, nil
}

func resolvePathAllowMissing(rootPath, targetPath string) (string, error) {
	rootAbs, err := filepath.Abs(rootPath)
	if err != nil {
		return "", err
	}
	joinedPath := filepath.Join(rootAbs, targetPath)
	securePath, err := filepath.Abs(joinedPath)
	if err != nil {
		return "", err
	}
	relativePath, err := filepath.Rel(rootAbs, securePath)
	if err != nil {
		return "", err
	}
	if relativePath == ".." || strings.HasPrefix(relativePath, ".."+string(filepath.Separator)) {
		return "", fmt.Errorf("path escapes project root: %s", targetPath)
	}
	return securePath, nil
}
