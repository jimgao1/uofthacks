client = language_v1.LanguageServiceClient()

# Available types: PLAIN_TEXT, HTML
type_ = language_v1.Document.Type.PLAIN_TEXT

# Optional. If not specified, the language is automatically detected.
# For list of supported languages:
# https://cloud.google.com/natural-language/docs/languages
language = "en"
document = {"content": text_content, "type_": type_, "language": language}

# Available values: NONE, UTF8, UTF16, UTF32
encoding_type = language_v1.EncodingType.UTF8

response = client.analyze_entities(request = {'document': document, 'encoding_type': encoding_type})

# Loop through entitites returned from the API

entity = response.entities[0]

print(u"keyword of the sentence: {}".format(entity.name))
