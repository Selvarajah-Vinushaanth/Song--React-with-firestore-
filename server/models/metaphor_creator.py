"""
Metaphor Creator Model
This module generates creative metaphors based on a given topic and style using Hugging Face models.
"""
import torch
from typing import List
from transformers import AutoTokenizer, AutoModelForCausalLM, pipeline
import random

# Define the model for text generation
# We're using GPT-2 as an example, but you could use a more advanced model like T5, BART, or GPT-3
MODEL_NAME = "gpt2"  # You can use more advanced models like "gpt2-large" or "EleutherAI/gpt-neo-1.3B"

# Initialize tokenizer and model (lazy loading - will load on first use)
tokenizer = None
model = None
generator = None

# Predefined metaphors for better quality when model fails
PREDEFINED_METAPHORS = {
    "positive": [
        "{source} is like a {target}, radiating beauty in the simplest of moments.",
        "{source} is like a brilliant {target}, revealing hidden depths and treasures within.",
        "{source} is like a shining {target}, illuminating the darkness with its radiant presence.",
        "Just as a {target} captures light, {source} captures the essence of beauty and wonder.",
        "Like a perfect {target}, {source} is formed through pressure yet emerges with incomparable brilliance."
    ],
    "negative": [
        "{source} is like a tarnished {target}, losing its luster with each passing day.",
        "{source} is like a cold {target}, distant and unyielding despite its beauty.",
        "{source} is like a fractured {target}, beautiful yet deeply flawed within.",
        "Like a {target} lost in darkness, {source} remains hidden from those who seek it most.",
        "{source} weighs upon the heart like a heavy {target}, beautiful but burdensome."
    ],
    "neutral": [
        "{source} is like a {target}, simple in appearance yet complex in nature.",
        "{source} transforms like a {target}, changing with perspective and light.",
        "{source} resembles a {target}, equally valued by some yet overlooked by others.",
        "Like a {target} that reflects its surroundings, {source} reveals more about the observer than itself.",
        "{source} exists like a {target}, neither seeking attention nor avoiding it."
    ]
}

def load_model():
    """Load the model and tokenizer if not already loaded"""
    global tokenizer, model, generator
    if tokenizer is None or model is None:
        tokenizer = AutoTokenizer.from_pretrained(MODEL_NAME)
        model = AutoModelForCausalLM.from_pretrained(MODEL_NAME)
        generator = pipeline('text-generation', model=model, tokenizer=tokenizer)

def generate_metaphor(topic: str, style: str = "general", count: int = 3, target: str = None) -> List[str]:
    """
    Generate creative metaphors based on the given topic and style using a Hugging Face model.
    
    Args:
        topic: The subject of the metaphor
        style: Style category (general, romantic, nature)
        count: Number of metaphors to generate
        target: Optional target domain to relate the metaphor to
    
    Returns:
        List of generated metaphors
    """
    # Map style to emotion for predefined metaphors
    emotion_map = {
        "romantic": "positive",
        "dark": "negative",
        "general": "neutral",
        "nature": "positive"
    }
    emotion = emotion_map.get(style, "neutral")
    
    # Load model if not already loaded
    load_model()
    
    # Limit count to reasonable range
    count = max(1, min(5, count))
    
    # Use target for comparison or default to general domains
    if not target or target == "general":
        # If no target specified, assign common domains based on style
        if style == "romantic":
            potential_targets = ["ocean", "flower", "star", "sunset", "diamond"]
        elif style == "dark":
            potential_targets = ["shadow", "storm", "abyss", "night", "fog"]
        elif style == "nature":
            potential_targets = ["tree", "river", "mountain", "sky", "garden"]
        else:  # general
            potential_targets = ["journey", "mirror", "bridge", "symphony", "painting"]
        
        # Select random targets from the appropriate list
        if not target:
            targets = random.sample(potential_targets, min(count, len(potential_targets)))
        else:
            targets = [target] * count
    else:
        targets = [target] * count
    
    # Create prompts based on style and whether target is provided
    prompts = []
    for i in range(count):
        current_target = targets[i % len(targets)]
        if style == "romantic":
            prompt = f"Create a beautiful metaphor comparing {topic} to {current_target}. {topic} is like"
        elif style == "dark":
            prompt = f"Create a deep metaphor comparing {topic} to {current_target}. {topic} is like"
        elif style == "nature":
            prompt = f"Create a nature metaphor comparing {topic} to {current_target}. {topic} is like"
        else:  # general
            prompt = f"Create a profound metaphor comparing {topic} to {current_target}. {topic} is"
        
        prompts.append((prompt, current_target))
    
    # Generate metaphors
    metaphors = []
    for prompt, current_target in prompts:
        try:
            # Generate text with the model
            output = generator(
                prompt,
                max_length=50,
                num_return_sequences=1,
                temperature=0.9,
                top_p=0.92,
                do_sample=True,
                pad_token_id=tokenizer.eos_token_id
            )
            
            # Extract and clean up the generated text
            generated_text = output[0]['generated_text']
            
            # Process the generated text to extract just the metaphor
            if " is like " in generated_text:
                start_idx = generated_text.find(" is like ") + 8
                metaphor = generated_text[start_idx:].strip()
                
                # Clean up: remove repetitive words and limit length
                words = metaphor.split()
                cleaned_words = []
                prev_word = None
                repetition_count = 0
                
                for word in words:
                    if word == prev_word:
                        repetition_count += 1
                        if repetition_count > 2:  # Allow max 2 repetitions
                            continue
                    else:
                        repetition_count = 0
                    
                    cleaned_words.append(word)
                    prev_word = word
                
                metaphor = " ".join(cleaned_words)
                
                # Truncate to first 20 words to keep it concise
                if len(cleaned_words) > 20:
                    metaphor = " ".join(cleaned_words[:20])
                
                # Ensure it ends with proper punctuation
                if not metaphor.endswith('.') and not metaphor.endswith('!') and not metaphor.endswith('?'):
                    metaphor = metaphor + '.'
                
                formatted_metaphor = f"{topic} is like {metaphor}"
                
                # Check if the metaphor makes sense
                if len(formatted_metaphor.split()) < 5 or len(formatted_metaphor) < 20:
                    # Use predefined metaphor if generated one is too short
                    template = random.choice(PREDEFINED_METAPHORS[emotion])
                    formatted_metaphor = template.format(source=topic, target=current_target)
                
                metaphors.append(formatted_metaphor)
            else:
                # Use predefined metaphor as fallback
                template = random.choice(PREDEFINED_METAPHORS[emotion])
                formatted_metaphor = template.format(source=topic, target=current_target)
                metaphors.append(formatted_metaphor)
            
        except Exception as e:
            # Fallback to predefined metaphor
            template = random.choice(PREDEFINED_METAPHORS[emotion])
            formatted_metaphor = template.format(source=topic, target=current_target)
            metaphors.append(formatted_metaphor)
    
    return metaphors
