from slowapi import Limiter
from slowapi.util import get_remote_address

# Standard Rate Limiter targeting remote host IPs
limiter = Limiter(key_func=get_remote_address)
