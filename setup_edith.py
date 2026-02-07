import os
import getpass
import json
from pathlib import Path

def clear_screen():
    os.system('cls' if os.name == 'nt' else 'clear')

def print_banner():
    print("=" * 60)
    print("      EDITH v3.0 (Elite Edition) - Setup Wizard")
    print("=" * 60)
    print("\nThis wizard will configure your EDITH environment.")
    print("Settings will be saved to .env and the system database.\n")

def get_input(prompt, default=None, secret=False):
    full_prompt = f"{prompt} [{default}]: " if default else f"{prompt}: "
    if secret:
        val = getpass.getpass(full_prompt)
    else:
        val = input(full_prompt)
    return val if val else default

def setup_llm():
    print("\n--- [1] LLM Service Configuration ---")
    print("Select your primary LLM provider:")
    print("1. Google Gemini")
    print("2. Groq")
    print("3. OpenAI")
    
    choice = get_input("Choice (1-3)", "1")
    
    config = {}
    if choice == "1":
        config['PRIMARY_LLM'] = "Gemini"
        config['PRIMARY_MODEL'] = get_input("Gemini Model", "gemini-2.5-flash")
        config['GOOGLE_API_KEY'] = get_input("Google API Key", secret=True)
    elif choice == "2":
        config['PRIMARY_LLM'] = "Groq"
        config['PRIMARY_MODEL'] = get_input("Groq Model", "openai/gpt-oss-20b")
        config['GROQ_API_KEY'] = get_input("Groq API Key", secret=True)
    else:
        config['PRIMARY_LLM'] = "OpenAI"
        config['PRIMARY_MODEL'] = get_input("OpenAI Model", "gpt-4o")
        config['OPENAI_API_KEY'] = get_input("OpenAI API Key", secret=True)
        
    return config

def setup_github():
    print("\n--- [2] GitHub Configuration ---")
    config = {}
    config['GITHUB_TOKEN'] = get_input("GitHub Personal Access Token (optional)", secret=True)
    config['DEFAULT_EDITOR'] = get_input("Default Editor (vs code / antigravity)", "vs code")
    return config

def setup_communication():
    print("\n--- [3] Communication Setup ---")
    config = {}
    config['ENABLE_TELEGRAM'] = get_input("Enable Telegram Bot? (yes/no)", "no").lower() == "yes"
    if config['ENABLE_TELEGRAM']:
        config['TELEGRAM_BOT_TOKEN'] = get_input("Telegram Bot Token", secret=True)
        
    config['ENABLE_WHATSAPP'] = get_input("Enable WhatsApp? (yes/no)", "no").lower() == "yes"
    if config['ENABLE_WHATSAPP']:
        config['TWILIO_ACCOUNT_SID'] = get_input("Twilio Account SID")
        config['TWILIO_AUTH_TOKEN'] = get_input("Twilio Auth Token", secret=True)
        config['TWILIO_WHATSAPP_NUMBER'] = get_input("Twilio WhatsApp Number (e.g., whatsapp:+14155238886)")
        
    return config

def save_config(full_config):
    env_path = Path(".env")
    existing_config = {}
    
    if env_path.exists():
        with open(env_path, "r") as f:
            for line in f:
                if "=" in line:
                    key, value = line.strip().split("=", 1)
                    existing_config[key] = value
    
    # Merge
    existing_config.update(full_config)
    
    with open(env_path, "w") as f:
        for key, value in sorted(existing_config.items()):
            if value is not None:
                f.write(f"{key}={value}\n")
                
    print(f"\n✅ Configuration saved to {env_path.absolute()}")

def main():
    clear_screen()
    print_banner()
    
    try:
        config = {}
        config.update(setup_llm())
        config.update(setup_github())
        config.update(setup_communication())
        
        save_config(config)
        
        print("\n" + "=" * 60)
        print("Setup Complete! You can now start EDITH.")
        print("=" * 60 + "\n")
        
    except KeyboardInterrupt:
        print("\n\nSetup cancelled.")

if __name__ == "__main__":
    main()
