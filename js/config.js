/* Address of the small server (see server/). Leave empty until it is deployed:
   the AI version then says the assistant is unavailable instead of faking replies. */
const API_URL='';
/* Learning-stage time limits in seconds. Quizzes have no limit, as agreed on the call. */
const LEARN_SECONDS={level1:180,level2:90,level3:150,level4:150};
const POINTS_PER_QUESTION=5,MAX_HELP=4,MAX_ATTEMPTS=2,MAX_LEARN_CHAT=10;
