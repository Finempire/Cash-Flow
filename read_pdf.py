import PyPDF2

try:
    with open('29755179.pdf', 'rb') as file:
        reader = PyPDF2.PdfReader(file)
        text = ""
        for page in reader.pages:
            text += page.extract_text()
        print(text)
except Exception as e:
    print(f"Error: {e}")
