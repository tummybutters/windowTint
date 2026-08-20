import importlib.util
import unittest
from pathlib import Path


HERE = Path(__file__).resolve().parent
spec = importlib.util.spec_from_file_location("google_ads_rest", HERE.parent / "google_ads_rest.py")
rest = importlib.util.module_from_spec(spec)
spec.loader.exec_module(rest)


class Response:
    status_code = 200
    text = "{}"
    headers = {}

    def json(self):
        return {}


class Session:
    def __init__(self):
        self.calls = []

    def post(self, url, **kwargs):
        self.calls.append((url, kwargs))
        return Response()


class ValidateOnlyMutationTest(unittest.TestCase):
    def test_service_mutate_can_validate_without_applying(self):
        session = Session()
        client = rest.GoogleAdsRestClient(
            customer_id="8605345590",
            developer_token="dev",
            access_token="access",
            login_customer_id="8605345590",
            allow_mutation=True,
            session=session,
        )

        result = client.mutate("campaignCriteria", [{"create": {"negative": True}}], validate_only=True)

        self.assertTrue(result["validate_only"])
        self.assertTrue(session.calls[0][1]["json"]["validateOnly"])
        self.assertFalse(session.calls[0][1]["json"]["partialFailure"])


if __name__ == "__main__":
    unittest.main()
