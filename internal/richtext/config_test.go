package richtext

import (
	"os"
	"path/filepath"
	"testing"
)

func TestLoadConfig(t *testing.T) {
	tests := []struct {
		name    string
		path    string
		wantErr bool
	}{
		{
			name:    "default config",
			path:    "",
			wantErr: false,
		},
		{
			name:    "non-existent file",
			path:    "/nonexistent/file.yaml",
			wantErr: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			config, err := LoadConfig(tt.path)
			if (err != nil) != tt.wantErr {
				t.Errorf("LoadConfig() error = %v, wantErr %v", err, tt.wantErr)
				return
			}
			if !tt.wantErr && config == nil {
				t.Error("LoadConfig() returned nil config without error")
			}
		})
	}
}

func TestLoadConfig_CustomFile(t *testing.T) {
	// Create a temporary custom config file
	tmpDir := t.TempDir()
	configPath := filepath.Join(tmpDir, "custom_styles.yaml")

	customYAML := `defaults:
  font: "Arial"
  size: 14
  color: "#333333"

styles:
  h1:
    font: "Arial-Bold"
    size: 28
    color: "#111111"
`

	if err := os.WriteFile(configPath, []byte(customYAML), 0644); err != nil {
		t.Fatalf("Failed to write custom config: %v", err)
	}

	config, err := LoadConfig(configPath)
	if err != nil {
		t.Fatalf("LoadConfig() error = %v", err)
	}

	// Test that we can retrieve styles (PreparedConfig doesn't expose raw config)
	h1Style := config.GetStyle("h1")
	if h1Style.Font == nil || *h1Style.Font != "Arial-Bold" {
		t.Errorf("Expected h1 font Arial-Bold, got %v", h1Style.Font)
	}
	if h1Style.Size == nil || *h1Style.Size != 28 {
		t.Errorf("Expected h1 size 28, got %v", h1Style.Size)
	}
	if h1Style.Color == nil {
		t.Error("Expected h1 color to be set")
	}
}

func TestLoadConfig_InvalidYAML(t *testing.T) {
	tmpDir := t.TempDir()
	configPath := filepath.Join(tmpDir, "invalid.yaml")

	invalidYAML := `defaults:
  font: "Arial"
  size: "not a number"
  color: "#333333"
`

	if err := os.WriteFile(configPath, []byte(invalidYAML), 0644); err != nil {
		t.Fatalf("Failed to write invalid config: %v", err)
	}

	_, err := LoadConfig(configPath)
	if err == nil {
		t.Error("LoadConfig() should have failed with invalid YAML")
	}
}

func TestLoadConfig_MissingDefaults(t *testing.T) {
	tmpDir := t.TempDir()
	configPath := filepath.Join(tmpDir, "missing_defaults.yaml")

	missingYAML := `styles:
  h1:
    font: "Arial-Bold"
`

	if err := os.WriteFile(configPath, []byte(missingYAML), 0644); err != nil {
		t.Fatalf("Failed to write config: %v", err)
	}

	_, err := LoadConfig(configPath)
	if err == nil {
		t.Error("LoadConfig() should have failed with missing defaults")
	}
}

func TestLoadConfig_InvalidDefaultsColor(t *testing.T) {
	tmpDir := t.TempDir()
	configPath := filepath.Join(tmpDir, "invalid_defaults_color.yaml")

	invalidYAML := `defaults:
  font: "Arial"
  size: 12
  color: "invalid-color"

styles:
  h1:
    font: "Arial-Bold"
    size: 24
`

	if err := os.WriteFile(configPath, []byte(invalidYAML), 0644); err != nil {
		t.Fatalf("Failed to write config: %v", err)
	}

	_, err := LoadConfig(configPath)
	if err == nil {
		t.Error("LoadConfig() should have failed with invalid defaults color")
	}
	if err != nil && !containsString(err.Error(), "invalid defaults.color") {
		t.Errorf("Expected error about invalid defaults.color, got: %v", err)
	}
}

func TestLoadConfig_InvalidStyleColor(t *testing.T) {
	tmpDir := t.TempDir()
	configPath := filepath.Join(tmpDir, "invalid_style_color.yaml")

	invalidYAML := `defaults:
  font: "Arial"
  size: 12
  color: "#000000"

styles:
  h1:
    font: "Arial-Bold"
    size: 24
    color: "not-a-valid-color"
`

	if err := os.WriteFile(configPath, []byte(invalidYAML), 0644); err != nil {
		t.Fatalf("Failed to write config: %v", err)
	}

	_, err := LoadConfig(configPath)
	if err == nil {
		t.Error("LoadConfig() should have failed with invalid style color")
	}
	if err != nil && !containsString(err.Error(), "invalid color in style h1") {
		t.Errorf("Expected error about invalid color in style h1, got: %v", err)
	}
}

func TestLoadConfig_ShortColorFormat(t *testing.T) {
	tmpDir := t.TempDir()
	configPath := filepath.Join(tmpDir, "short_color.yaml")

	invalidYAML := `defaults:
  font: "Arial"
  size: 12
  color: "#FFF"

styles:
  h1:
    font: "Arial-Bold"
    size: 24
`

	if err := os.WriteFile(configPath, []byte(invalidYAML), 0644); err != nil {
		t.Fatalf("Failed to write config: %v", err)
	}

	_, err := LoadConfig(configPath)
	if err == nil {
		t.Error("LoadConfig() should have failed with short color format #FFF")
	}
	if err != nil && !containsString(err.Error(), "invalid color format") {
		t.Errorf("Expected error about invalid color format, got: %v", err)
	}
}

func TestLoadConfig_InvalidHexCharacters(t *testing.T) {
	tmpDir := t.TempDir()
	configPath := filepath.Join(tmpDir, "invalid_hex.yaml")

	invalidYAML := `defaults:
  font: "Arial"
  size: 12
  color: "#GGGGGG"

styles:
  h1:
    font: "Arial-Bold"
    size: 24
`

	if err := os.WriteFile(configPath, []byte(invalidYAML), 0644); err != nil {
		t.Fatalf("Failed to write config: %v", err)
	}

	_, err := LoadConfig(configPath)
	if err == nil {
		t.Error("LoadConfig() should have failed with invalid hex characters")
	}
	if err != nil && !containsString(err.Error(), "invalid") {
		t.Errorf("Expected error about invalid color, got: %v", err)
	}
}

// Helper function to check if a string contains a substring
func containsString(s, substr string) bool {
	return len(s) >= len(substr) && (s == substr || len(s) > len(substr) && findSubstring(s, substr))
}

func findSubstring(s, substr string) bool {
	for i := 0; i <= len(s)-len(substr); i++ {
		if s[i:i+len(substr)] == substr {
			return true
		}
	}
	return false
}

func TestWebColorToAppleRGB(t *testing.T) {
	tests := []struct {
		name     string
		webColor string
		want     AppleRGB
		wantErr  bool
	}{
		{
			name:     "black",
			webColor: "#000000",
			want:     AppleRGB{0, 0, 0},
			wantErr:  false,
		},
		{
			name:     "white",
			webColor: "#FFFFFF",
			want:     AppleRGB{65535, 65535, 65535},
			wantErr:  false,
		},
		{
			name:     "red",
			webColor: "#FF0000",
			want:     AppleRGB{65535, 0, 0},
			wantErr:  false,
		},
		{
			name:     "green",
			webColor: "#00FF00",
			want:     AppleRGB{0, 65535, 0},
			wantErr:  false,
		},
		{
			name:     "blue",
			webColor: "#0000FF",
			want:     AppleRGB{0, 0, 65535},
			wantErr:  false,
		},
		{
			name:     "gray",
			webColor: "#808080",
			want:     AppleRGB{32896, 32896, 32896},
			wantErr:  false,
		},
		{
			name:     "without hash",
			webColor: "FF0000",
			want:     AppleRGB{65535, 0, 0},
			wantErr:  false,
		},
		{
			name:     "invalid length",
			webColor: "#FFF",
			want:     AppleRGB{},
			wantErr:  true,
		},
		{
			name:     "invalid hex",
			webColor: "#GGGGGG",
			want:     AppleRGB{},
			wantErr:  true,
		},
		{
			name:     "empty",
			webColor: "",
			want:     AppleRGB{},
			wantErr:  true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, err := webColorToAppleRGB(tt.webColor)
			if (err != nil) != tt.wantErr {
				t.Errorf("webColorToAppleRGB() error = %v, wantErr %v", err, tt.wantErr)
				return
			}
			if !tt.wantErr {
				if got[0] != tt.want[0] || got[1] != tt.want[1] || got[2] != tt.want[2] {
					t.Errorf("webColorToAppleRGB() = %v, want %v", got, tt.want)
				}
			}
		})
	}
}

func TestGetStyle(t *testing.T) {
	// Create temporary config file
	tmpDir := t.TempDir()
	configPath := filepath.Join(tmpDir, "test_styles.yaml")

	configYAML := `defaults:
  font: "Helvetica"
  size: 12
  color: "#000000"

styles:
  h1:
    font: "Helvetica-Bold"
    size: 24
    color: "#111111"
  code:
    font: "Menlo-Regular"
    color: "#D73A49"
`

	if err := os.WriteFile(configPath, []byte(configYAML), 0644); err != nil {
		t.Fatalf("Failed to write config: %v", err)
	}

	config, err := LoadConfig(configPath)
	if err != nil {
		t.Fatalf("LoadConfig() error = %v", err)
	}

	tests := []struct {
		name        string
		elementType string
		wantFont    string
		wantSize    int
		wantColor   *AppleRGB
	}{
		{
			name:        "h1 full override",
			elementType: "h1",
			wantFont:    "Helvetica-Bold",
			wantSize:    24,
			wantColor:   &AppleRGB{4369, 4369, 4369}, // #111111
		},
		{
			name:        "code partial override",
			elementType: "code",
			wantFont:    "Menlo-Regular",
			wantSize:    12,                             // from defaults
			wantColor:   &AppleRGB{55255, 14906, 18761}, // #D73A49
		},
		{
			name:        "paragraph uses defaults",
			elementType: "paragraph",
			wantFont:    "Helvetica",
			wantSize:    12,
			wantColor:   &AppleRGB{0, 0, 0}, // #000000
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			style := config.GetStyle(tt.elementType)
			if style.Font == nil || *style.Font != tt.wantFont {
				t.Errorf("GetStyle().Font = %v, want %s", style.Font, tt.wantFont)
			}
			if style.Size == nil || *style.Size != tt.wantSize {
				t.Errorf("GetStyle().Size = %v, want %d", style.Size, tt.wantSize)
			}
			if tt.wantColor != nil {
				if style.Color == nil {
					t.Errorf("GetStyle().Color = nil, want %v", tt.wantColor)
				} else if *style.Color != *tt.wantColor {
					t.Errorf("GetStyle().Color = %v, want %v", *style.Color, *tt.wantColor)
				}
			}
		})
	}
}

func TestValidateConfig(t *testing.T) {
	tests := []struct {
		name    string
		config  *RenderingConfig
		wantErr bool
	}{
		{
			name: "valid config",
			config: &RenderingConfig{
				Defaults: StyleConfig{
					Font:  new("Helvetica"),
					Size:  new(12),
					Color: new("#000000"),
				},
				Styles: map[string]StyleConfig{
					"h1": {
						Font:  new("Helvetica-Bold"),
						Size:  new(24),
						Color: new("#111111"),
					},
				},
			},
			wantErr: false,
		},
		{
			name: "missing defaults font",
			config: &RenderingConfig{
				Defaults: StyleConfig{
					Size:  new(12),
					Color: new("#000000"),
				},
			},
			wantErr: true,
		},
		{
			name: "negative defaults size",
			config: &RenderingConfig{
				Defaults: StyleConfig{
					Font:  new("Helvetica"),
					Size:  new(-1),
					Color: new("#000000"),
				},
			},
			wantErr: true,
		},
		{
			name: "missing defaults color is allowed",
			config: &RenderingConfig{
				Defaults: StyleConfig{
					Font: new("Helvetica"),
					Size: new(12),
					// Color is optional - Mail.app will use default text color
				},
			},
			wantErr: false,
		},
		{
			name: "invalid defaults color",
			config: &RenderingConfig{
				Defaults: StyleConfig{
					Font:  new("Helvetica"),
					Size:  new(12),
					Color: new("invalid"),
				},
			},
			wantErr: true,
		},
		{
			name: "invalid style color",
			config: &RenderingConfig{
				Defaults: StyleConfig{
					Font:  new("Helvetica"),
					Size:  new(12),
					Color: new("#000000"),
				},
				Styles: map[string]StyleConfig{
					"h1": {
						Color: new("invalid"),
					},
				},
			},
			wantErr: true,
		},
		{
			name: "negative style size",
			config: &RenderingConfig{
				Defaults: StyleConfig{
					Font:  new("Helvetica"),
					Size:  new(12),
					Color: new("#000000"),
				},
				Styles: map[string]StyleConfig{
					"h1": {
						Size: new(-5),
					},
				},
			},
			wantErr: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := validateConfig(tt.config)
			if (err != nil) != tt.wantErr {
				t.Errorf("validateConfig() error = %v, wantErr %v", err, tt.wantErr)
			}
		})
	}
}
