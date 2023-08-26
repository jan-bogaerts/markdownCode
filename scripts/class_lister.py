import sys
from time import sleep
from constants import get_model_config, DEFAULT_MAX_TOKENS, OPENAI_API_KEY
import project
import result_loader
import constant_lister

import openai
import tiktoken


ONLY_MISSING = True # only check if the fragment has not yet been processed

system_prompt = """Act as an ai software analyst.
You are tasked with writing software for an application called '{0}',
using the following development stack:
{1}
"""
user_prompt = """list all the classes declared in:

'{0}'

{1}"""
term_prompt = """
Do not include UI components, but only list the classes that need to be custom built.
return an empty array if you can't detect any classes.
don't include any introduction. Don't include any explanation, just write the list of classes as a
json array.

bad:
[
  {
    "file": "x.js",
    "items": [
      "x"
    ]
  },
  {
    "file": "y.js",
    "items": [
      "y"
    ]
  }
]

good:
[
    "x",
    "y"
]"""


def generate_response(params, key):

    total_tokens = 0
    model = get_model_config('class_lister', key)
    
    def reportTokens(prompt):
        encoding = tiktoken.encoding_for_model(model)
        # print number of tokens in light gray, with first 10 characters of prompt in green
        token_len = len(encoding.encode(prompt))
        print(
            "\033[37m"
            + str(token_len)
            + " tokens\033[0m"
            + " in prompt: "
            + "\033[92m"
            + prompt
            + "\033[0m"
        )
        return token_len

    # Set up your OpenAI API credentials
    openai.api_key = OPENAI_API_KEY

    messages = []
    prompt = system_prompt.format(params['project_name'], params['dev_stack'] ) + term_prompt
    messages.append({"role": "system", "content": prompt})
    total_tokens += reportTokens(prompt)
    prompt = user_prompt.format(params['feature_title'], params['feature_description'])
    messages.append({"role": "user", "content": prompt})
    total_tokens += reportTokens(prompt)
    
    total_tokens *= 2  # max result can be as long as the input, also need to include the input itself
    if total_tokens > DEFAULT_MAX_TOKENS:
        total_tokens = DEFAULT_MAX_TOKENS
    params = {
        "model": model,
        "messages": messages,
        "max_tokens": total_tokens,
        "temperature": 0,
    }

    # Send the API request
    keep_trying = True
    response = None
    while keep_trying:
        try:
            response = openai.ChatCompletion.create(**params)
            keep_trying = False
        except Exception as e:
            # e.g. when the API is too busy, we don't want to fail everything
            print("Failed to generate response (retrying in 30 sec). Error: ", e)
            sleep(30)
            print("Retrying...")

    # Get the reply from the API response
    if response:
        reply = response.choices[0]["message"]["content"] # type: ignore
        return reply
    return None


def add_result(to_add, result, writer):
    result.append(to_add)
    writer.write(to_add + "\n")
    writer.flush()


def collect_response(title, response, result, writer):
    # get the first line in the component without the ## and the #
    add_result(f'# {title}', result, writer)
    add_result(response, result, writer)


def process_data(writer):
    result = []

    project_desc = project.fragments[0]
    dev_stack = project.fragments[1].content

    for to_check in project.fragments[2:]:  # skip the first two fragments cause that's the description and dev stack
        if to_check.content == '':
            continue
        if ONLY_MISSING and has_fragment(to_check.full_title):
            continue
        # check if 'services' is in the full title, if so, skip it
        if not 'services' in to_check.full_title.lower():
            continue
        content = constant_lister.get_fragment(to_check.full_title, to_check.content)
        params = {
            'project_name': project_desc.title,
            # 'project_description': project_desc.content,
            'feature_title': to_check.title,
            'feature_description': content,
            'dev_stack': dev_stack,
        }
        response = generate_response(params, to_check.full_title)
        if response:
            collect_response(to_check.full_title, response, result, writer)
    return result
                    


def main(prompt, constants, file=None):
    # read file from prompt if it ends in a .md filetype
    if prompt.endswith(".md"):
        with open(prompt, "r") as promptfile:
            prompt = promptfile.read()

    print("loading project")

    # split the prompt into a toolbar, list of components and a list of services, based on the markdown headers
    project.split_standard(prompt)
    constant_lister.load_results(constants)

    # save there result to a file while rendering.
    if file is None:
        file = 'output'
    
    file_name = file + "_classes.md"
    open_mode = 'w'
    if ONLY_MISSING:
        load_results(file_name)
        open_mode = 'a'

    print("rendering results")

    with open(file_name, open_mode) as writer:
        process_data(writer)
    
    print("done! check out the output file for the results!")


text_fragments = []  # the list of text fragments representing all the results that were rendered.

def load_results(filename, overwrite_file_name=None):
    if not overwrite_file_name:
        # modify the filename so that the filename without extension ends on _overwrite
        overwrite_file_name = filename.split('.')[0] + '_overwrite.' + filename.split('.')[1]
    result_loader.load(filename, text_fragments, True, overwrite_file_name)
    

def get_data(title):
    '''returns the list of components for the given title'''
    to_search = title.strip()
    if not to_search.startswith('# '):
        to_search = '# ' + to_search
    for fragment in text_fragments:
        if fragment.title == to_search:
            return fragment.data or []
    return []    


def get_classes(title):
    to_search = title.strip()
    if not to_search.startswith('# '):
        to_search = '# ' + to_search
    for fragment in text_fragments:
        if fragment.title == to_search:
            return fragment.data or []
    return []  


def has_fragment(title):
    '''returns true if the title is in the list of fragments'''
    to_search = title.strip()
    if not to_search.startswith('# '):
        to_search = '# ' + to_search
    for fragment in text_fragments:
        if fragment.title == to_search:
            return True
    return False


if __name__ == "__main__":

    # Check for arguments
    if len(sys.argv) < 3:
        print("Please provide a prompt")
        sys.exit(1)
    else:
        # Set prompt to the first argument
        prompt = sys.argv[1]
        constants = sys.argv[2]

    # Pull everything else as normal
    file = sys.argv[3] if len(sys.argv) > 3 else None

    # Run the main function
    main(prompt, constants, file)
