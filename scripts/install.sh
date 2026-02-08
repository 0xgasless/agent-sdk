#!/bin/bash
set -euo pipefail

# ═══════════════════════════════════════════════════════════════════════════════
# MoltPay Installer for macOS and Linux
# The Financial Layer for AI Agents
# Usage: curl -fsSL https://moltpay.io/install.sh | bash
# ═══════════════════════════════════════════════════════════════════════════════

# ─────────────────────────────────────────
# Colors & Branding
# ─────────────────────────────────────────
BOLD='\033[1m'
ACCENT='\033[38;2;255;90;45m'
SUCCESS='\033[38;2;47;191;113m'
WARN='\033[38;2;255;176;32m'
ERROR='\033[38;2;226;61;45m'
INFO='\033[38;2;100;180;255m'
MUTED='\033[38;2;139;127;119m'
NC='\033[0m'

LOBSTER="🦞"

# ─────────────────────────────────────────
# Taglines
# ─────────────────────────────────────────
TAGLINES=(
    "Your agent just got a wallet. Watch out, humans."
    "Gasless transactions for AI. Because robots shouldn't pay gas fees."
    "The financial layer for the agent economy."
    "Payments so easy, even an AI can do it."
    "0xGasless inside. Your wallet thanks you."
    "Because your agent deserves better than a credit card."
    "Crypto payments, agent-style."
    "From zero to deployed wallet in one command."
    "The lobster has claws, and now it has a wallet."
    "Making AI agents economically sovereign since 2024."
)

pick_tagline() {
    local count=${#TAGLINES[@]}
    local idx=$((RANDOM % count))
    echo "${TAGLINES[$idx]}"
}

# ─────────────────────────────────────────
# Configuration
# ─────────────────────────────────────────
MOLTPAY_VERSION=${MOLTPAY_VERSION:-latest}
DRY_RUN=${MOLTPAY_DRY_RUN:-0}
NO_INIT=${MOLTPAY_NO_INIT:-0}
PACKAGE_NAME="@0xgasless/agent-sdk"

# ─────────────────────────────────────────
# Helper Functions
# ─────────────────────────────────────────
print_banner() {
    echo ""
    echo -e "${ACCENT}${BOLD}"
    echo "   ,,"
    echo "  ('')        ${LOBSTER} MoltPay Installer"
    echo "   ||         The Financial Layer for AI Agents"
    echo -e "${NC}"
    echo -e "${MUTED}  $(pick_tagline)${NC}"
    echo ""
}

log_step() {
    echo -e "  ${INFO}→${NC} $1"
}

log_success() {
    echo -e "  ${SUCCESS}✓${NC} $1"
}

log_warn() {
    echo -e "  ${WARN}⚠${NC} $1"
}

log_error() {
    echo -e "  ${ERROR}✖${NC} $1"
}

# ─────────────────────────────────────────
# OS Detection
# ─────────────────────────────────────────
detect_os() {
    if [[ "$OSTYPE" == "darwin"* ]]; then
        echo "macos"
    elif [[ "$OSTYPE" == "linux-gnu"* ]] || [[ -n "${WSL_DISTRO_NAME:-}" ]]; then
        echo "linux"
    else
        echo "unknown"
    fi
}

# ─────────────────────────────────────────
# Homebrew (macOS)
# ─────────────────────────────────────────
install_homebrew() {
    if [[ "$(detect_os)" != "macos" ]]; then
        return 0
    fi
    
    if command -v brew &> /dev/null; then
        log_success "Homebrew already installed"
        return 0
    fi
    
    log_step "Installing Homebrew..."
    /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
    
    # Add to PATH for this session
    if [[ -f "/opt/homebrew/bin/brew" ]]; then
        eval "$(/opt/homebrew/bin/brew shellenv)"
    elif [[ -f "/usr/local/bin/brew" ]]; then
        eval "$(/usr/local/bin/brew shellenv)"
    fi
    
    log_success "Homebrew installed"
}

# ─────────────────────────────────────────
# Node.js
# ─────────────────────────────────────────
check_node() {
    if command -v node &> /dev/null; then
        local version
        version=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
        if [[ "$version" -ge 18 ]]; then
            log_success "Node.js v$(node -v | cut -d'v' -f2) found"
            return 0
        else
            log_warn "Node.js $(node -v) found, but v18+ required"
            return 1
        fi
    else
        log_warn "Node.js not found"
        return 1
    fi
}

install_node() {
    local os
    os=$(detect_os)
    
    if [[ "$os" == "macos" ]]; then
        log_step "Installing Node.js via Homebrew..."
        brew install node@22
        brew link node@22 --overwrite --force 2>/dev/null || true
    elif [[ "$os" == "linux" ]]; then
        log_step "Installing Node.js via NodeSource..."
        if command -v apt-get &> /dev/null; then
            curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
            sudo apt-get install -y nodejs
        elif command -v dnf &> /dev/null; then
            curl -fsSL https://rpm.nodesource.com/setup_22.x | sudo bash -
            sudo dnf install -y nodejs
        elif command -v yum &> /dev/null; then
            curl -fsSL https://rpm.nodesource.com/setup_22.x | sudo bash -
            sudo yum install -y nodejs
        else
            log_error "Could not detect package manager"
            echo "Please install Node.js 18+ manually: https://nodejs.org"
            exit 1
        fi
    fi
    
    log_success "Node.js installed"
}

# ─────────────────────────────────────────
# npm Permissions (Linux)
# ─────────────────────────────────────────
fix_npm_permissions() {
    if [[ "$(detect_os)" != "linux" ]]; then
        return 0
    fi
    
    local npm_prefix
    npm_prefix="$(npm config get prefix 2>/dev/null || true)"
    
    if [[ -z "$npm_prefix" ]]; then
        return 0
    fi
    
    if [[ -w "$npm_prefix" || -w "$npm_prefix/lib" ]]; then
        return 0
    fi
    
    log_step "Configuring npm for user-local installs..."
    mkdir -p "$HOME/.npm-global"
    npm config set prefix "$HOME/.npm-global"
    
    local path_line='export PATH="$HOME/.npm-global/bin:$PATH"'
    for rc in "$HOME/.bashrc" "$HOME/.zshrc"; do
        if [[ -f "$rc" ]] && ! grep -q ".npm-global" "$rc"; then
            echo "$path_line" >> "$rc"
        fi
    done
    
    export PATH="$HOME/.npm-global/bin:$PATH"
    log_success "npm configured for user installs"
}

# ─────────────────────────────────────────
# MoltPay Installation
# ─────────────────────────────────────────
install_moltpay() {
    log_step "Installing MoltPay (${PACKAGE_NAME}@${MOLTPAY_VERSION})..."
    
    if [[ "$DRY_RUN" == "1" ]]; then
        log_success "Dry run: would run 'npm install -g ${PACKAGE_NAME}@${MOLTPAY_VERSION}'"
        return 0
    fi
    
    npm install -g "${PACKAGE_NAME}@${MOLTPAY_VERSION}" --no-fund --no-audit
    
    log_success "MoltPay installed"
}

# ─────────────────────────────────────────
# Post-Install: Init Wallet
# ─────────────────────────────────────────
run_init() {
    if [[ "$NO_INIT" == "1" ]]; then
        log_warn "Skipping wallet initialization (--no-init)"
        return 0
    fi
    
    if [[ ! -r /dev/tty || ! -w /dev/tty ]]; then
        log_warn "No TTY available, skipping init. Run 'moltpay init' later."
        return 0
    fi
    
    echo ""
    log_step "Starting wallet setup..."
    echo ""
    
    if command -v moltpay &> /dev/null; then
        exec moltpay init </dev/tty
    else
        # Try to find it in npm global bin
        local npm_bin
        npm_bin="$(npm config get prefix)/bin"
        if [[ -x "${npm_bin}/moltpay" ]]; then
            export PATH="${npm_bin}:$PATH"
            exec moltpay init </dev/tty
        else
            log_warn "moltpay not found on PATH. Run 'moltpay init' manually."
        fi
    fi
}

# ─────────────────────────────────────────
# Print Usage
# ─────────────────────────────────────────
print_usage() {
    cat <<EOF
MoltPay Installer (macOS + Linux)

Usage:
  curl -fsSL https://moltpay.io/install.sh | bash
  curl -fsSL https://moltpay.io/install.sh | bash -s -- [options]

Options:
  --version <version>   Install specific version (default: latest)
  --no-init             Skip wallet initialization
  --dry-run             Show what would happen without changes
  --help, -h            Show this help

Environment Variables:
  MOLTPAY_VERSION=latest|<semver>
  MOLTPAY_NO_INIT=1
  MOLTPAY_DRY_RUN=1

Examples:
  curl -fsSL https://moltpay.io/install.sh | bash
  curl -fsSL https://moltpay.io/install.sh | bash -s -- --no-init
  MOLTPAY_VERSION=0.2.0 curl -fsSL https://moltpay.io/install.sh | bash
EOF
}

# ─────────────────────────────────────────
# Parse Arguments
# ─────────────────────────────────────────
HELP=0

parse_args() {
    while [[ $# -gt 0 ]]; do
        case "$1" in
            --version)
                MOLTPAY_VERSION="$2"
                shift 2
                ;;
            --no-init)
                NO_INIT=1
                shift
                ;;
            --dry-run)
                DRY_RUN=1
                shift
                ;;
            --help|-h)
                HELP=1
                shift
                ;;
            *)
                shift
                ;;
        esac
    done
}

# ─────────────────────────────────────────
# Main
# ─────────────────────────────────────────
main() {
    if [[ "$HELP" == "1" ]]; then
        print_usage
        return 0
    fi
    
    print_banner
    
    # Detect OS
    local os
    os=$(detect_os)
    
    if [[ "$os" == "unknown" ]]; then
        log_error "Unsupported operating system"
        echo "This installer supports macOS and Linux (including WSL)."
        exit 1
    fi
    
    log_success "Detected: $os"
    
    # Step 1: Homebrew (macOS)
    install_homebrew
    
    # Step 2: Node.js
    if ! check_node; then
        install_node
    fi
    
    # Step 3: npm permissions (Linux)
    fix_npm_permissions
    
    # Step 4: Install MoltPay
    install_moltpay
    
    # Success!
    echo ""
    echo -e "${SUCCESS}${BOLD}${LOBSTER} MoltPay installed successfully!${NC}"
    echo ""
    echo -e "  ${MUTED}Commands:${NC}"
    echo -e "    ${INFO}moltpay init${NC}      - Set up your agent wallet"
    echo -e "    ${INFO}moltpay register${NC}  - Register on ERC-8004"
    echo -e "    ${INFO}moltpay pay${NC}       - Send gasless payments"
    echo -e "    ${INFO}moltpay verify${NC}    - Verify on MoltBook"
    echo ""
    echo -e "  ${MUTED}Docs:${NC} ${INFO}https://docs.0xgasless.com${NC}"
    echo ""
    
    # Step 5: Run init
    run_init
}

parse_args "$@"
main
