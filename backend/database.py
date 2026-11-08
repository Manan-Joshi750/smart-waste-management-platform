import os
import urllib.parse
from dotenv import load_dotenv
from pymongo import MongoClient

# Load environment variables from the .env file
load_dotenv()

# 1. Safely fetch and encode your username and password from .env
username = urllib.parse.quote_plus(os.getenv("MONGO_USERNAME", ""))
password = urllib.parse.quote_plus(os.getenv("MONGO_PASSWORD", ""))

# 2. Use an f-string to inject the encoded username and password into the URI
MONGO_URI = f"mongodb+srv://{username}:{password}@cluster0.rwx7pw6.mongodb.net/"

# 3. Connect to the MongoDB Atlas cluster
client = MongoClient(MONGO_URI, tlsAllowInvalidCertificates=True)

# 4. Create/Connect to a database specifically for this project
db = client.smart_waste_db

# 5. Create/Connect to the collections
bins_collection = db.bins
history_collection = db.history # NEW: Collection for archived/cleaned bins

print("MongoDB Atlas Cloud connected successfully!")