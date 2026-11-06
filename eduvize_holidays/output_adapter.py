"""Strict, public calendar settings; publication and entitlement remain in the core registry."""
from typing import Annotated, Literal
from pydantic import BaseModel, ConfigDict, Field, StrictBool, StrictInt

class CalendarSettings(BaseModel):
    model_config = ConfigDict(extra='forbid', strict=True)
    country: Literal['cz', 'sk']
    monthFormat: Literal['text', 'number']
    days: Annotated[StrictInt, Field(ge=0, le=6)]
    tomorrow: StrictBool
    holidays: StrictBool
    significant: StrictBool
    nameDetails: StrictBool

def validate(payload, presentation):
    return CalendarSettings.model_validate(payload).model_dump()

def get_output_adapters():
    from eduvize_admin.output_registry import Adapter
    return {'holidays': Adapter(validate, '/eduvize-svatky/published.html')}
