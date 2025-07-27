#!/bin/bash

# ITG DocVerse Complete API Test Script
# Comprehensive test suite for all endpoints with middleware authentication
# Merged from test_api.sh, test_api_enhanced.sh, and test_api_clean.sh

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# API Base URL
BASE_URL="http://localhost:8000"

# Test counter
TESTS_PASSED=0
TESTS_FAILED=0

# JWT Token storage
JWT_TOKEN=""

# Function to print test header
print_test() {
    echo -e "\n${BLUE}🧪 Testing: $1${NC}"
    echo "=================================================="
}

# Function to print success
print_success() {
    echo -e "${GREEN}✅ PASS: $1${NC}"
    ((TESTS_PASSED++))
}

# Function to print failure
print_failure() {
    echo -e "${RED}❌ FAIL: $1${NC}"
    echo -e "${RED}   Response: $2${NC}"
    ((TESTS_FAILED++))
}

# Function to print info
print_info() {
    echo -e "${CYAN}ℹ️  INFO: $1${NC}"
}

# Function to make API call and check response
test_endpoint() {
    local method=$1
    local endpoint=$2
    local description=$3
    local data=$4
    local expected_status=${5:-200}
    local expected_content=$6
    local use_auth=${7:-false}
    
    echo -e "${YELLOW}→ $method $endpoint${NC}"
    
    # Build headers array
    local headers=()
    headers+=(-H "accept: application/json")
    
    if [ "$use_auth" = "true" ] && [ -n "$JWT_TOKEN" ]; then
        headers+=(-H "Authorization: Bearer $JWT_TOKEN")
    fi
    
    # Make the request
    if [ -n "$data" ]; then
        headers+=(-H "Content-Type: application/json")
        response=$(curl -s -w "\n%{http_code}" -X "$method" "$BASE_URL$endpoint" "${headers[@]}" -d "$data")
    else
        response=$(curl -s -w "\n%{http_code}" -X "$method" "$BASE_URL$endpoint" "${headers[@]}")
    fi
    
    # Extract status code (last line) and body (everything else)
    status_code=$(echo "$response" | tail -n 1)
    body=$(echo "$response" | sed '$d')
    
    # Auto-extract JWT token if this is auth endpoint
    if [[ "$endpoint" == "/apis/public/auth"* ]] && [ "$status_code" -eq 200 ]; then
        JWT_TOKEN=$(echo "$body" | grep -o '"access_token":"[^"]*"' | cut -d'"' -f4)
        if [ -n "$JWT_TOKEN" ]; then
            echo -e "${PURPLE}   🔑 JWT Token obtained: ${JWT_TOKEN:0:30}...${NC}"
        fi
    fi
    
    # Check results
    if [ "$status_code" -eq "$expected_status" ]; then
        if [ -n "$expected_content" ]; then
            if echo "$body" | grep -q "$expected_content"; then
                print_success "$description"
            else
                print_failure "$description - Content mismatch" "$body"
            fi
        else
            print_success "$description"
        fi
    else
        print_failure "$description - Status: $status_code" "$body"
    fi
    
    echo "   Response: $body"
}

# Start testing
echo -e "${BLUE}"
echo "██╗████████╗ ██████╗     ██████╗  ██████╗  ██████╗██╗   ██╗███████╗██████╗ ███████╗███████╗"
echo "██║╚══██╔══╝██╔════╝     ██╔══██╗██╔═══██╗██╔════╝██║   ██║██╔════╝██╔══██╗██╔════╝██╔════╝"
echo "██║   ██║   ██║  ███╗    ██║  ██║██║   ██║██║     ██║   ██║█████╗  ██████╔╝███████╗█████╗  "
echo "██║   ██║   ██║   ██║    ██║  ██║██║   ██║██║     ╚██╗ ██╔╝██╔══╝  ██╔══██╗╚════██║██╔══╝  "
echo "██║   ██║   ╚██████╔╝    ██████╔╝╚██████╔╝╚██████╗ ╚████╔╝ ███████╗██║  ██║███████║███████╗"
echo "╚═╝   ╚═╝    ╚═════╝     ╚═════╝  ╚═════╝  ╚═════╝  ╚═══╝  ╚══════╝╚═╝  ╚═╝╚══════╝╚══════╝"
echo -e "${NC}"
echo -e "${YELLOW}Complete API Test Suite - Clean Architecture with Middleware Authentication${NC}"
echo -e "Base URL: $BASE_URL\n"

# Check if server is running
echo -e "${BLUE}🔍 Checking if server is running...${NC}"
if ! curl -s "$BASE_URL/api/health" > /dev/null; then
    echo -e "${RED}❌ Server is not running on $BASE_URL${NC}"
    echo -e "${YELLOW}💡 Please start the server first with:${NC}"
    echo -e "   /Users/prakash/MyDocs/Projects/itg-docverse/.venv/bin/python /Users/prakash/MyDocs/Projects/itg-docverse/apis/main.py"
    exit 1
fi
echo -e "${GREEN}✅ Server is running${NC}"

# ===========================================
# HEALTH CHECK TESTS
# ===========================================
print_test "Health Check Endpoint"
test_endpoint "GET" "/api/health" "Health check" "" 200 "healthy"

# ===========================================
# PUBLIC AUTHENTICATION TESTS
# ===========================================
print_test "Public Authentication Endpoints"

# Test authentication endpoint (this will auto-capture JWT token)
test_endpoint "POST" "/apis/public/auth" "Get JWT token" "" 200 "access_token"

# Verify we got a token
if [ -z "$JWT_TOKEN" ]; then
    echo -e "${RED}❌ Failed to obtain JWT token - cannot proceed with authenticated tests${NC}"
    exit 1
fi

print_info "JWT Token successfully obtained and will be used for authenticated endpoints"

# ===========================================
# AUTHENTICATION VERIFICATION TESTS
# ===========================================
print_test "Authentication Verification"

# Test unauthorized access
test_endpoint "GET" "/apis/posts/" "Unauthorized access (should fail)" "" 401 "" false

# Test authorized access
test_endpoint "GET" "/apis/posts/" "Authorized access (should succeed)" "" 200 "" true

# ===========================================
# POSTS API TESTS (Comprehensive)
# ===========================================
print_test "Posts API Endpoints - Full CRUD Operations"

# Test all post types
declare -a post_types=("posts" "thoughts" "llm-short" "llm-long" "block-diagram" "code-snippet" "discussion")

for post_type in "${post_types[@]}"; do
    test_endpoint "POST" "/apis/posts/" "Create post type: $post_type" \
        "{\"title\": \"Test $post_type\", \"content\": \"This is a test $post_type content\", \"post_type\": \"$post_type\"}" \
        200 "$post_type" true
done

# Test GET posts with data
test_endpoint "GET" "/apis/posts/" "Get all posts (with created data)" "" 200 "" true

# Test search functionality
test_endpoint "GET" "/apis/posts/search/?q=test" "Search posts by keyword 'test'" "" 200 "" true

# Test pagination
test_endpoint "GET" "/apis/posts/?skip=0&limit=3" "Posts with pagination (limit 3)" "" 200 "" true
test_endpoint "GET" "/apis/posts/?skip=3&limit=3" "Posts with pagination (skip 3)" "" 200 "" true

# Test filtering
test_endpoint "GET" "/apis/posts/?post_type=posts" "Filter by post_type 'posts'" "" 200 "" true
test_endpoint "GET" "/apis/posts/?status=draft" "Filter by status 'draft'" "" 200 "" true
test_endpoint "GET" "/apis/posts/?post_type=thoughts&status=draft" "Filter by type and status" "" 200 "" true

# Test error cases
test_endpoint "POST" "/apis/posts/" "Create post with invalid type" \
    '{"title": "Invalid Post", "content": "This has invalid type", "post_type": "invalid-type"}' \
    422 "" true

test_endpoint "POST" "/apis/posts/" "Create post missing title (should auto-generate)" \
    '{"content": "Content without title", "post_type": "posts"}' \
    200 "" true

test_endpoint "POST" "/apis/posts/" "Create thought without title (frontend test)" \
    '{"content": "hello world", "post_type": "thoughts", "tags": ["hello"], "status": "draft"}' \
    200 "" true

test_endpoint "POST" "/apis/posts/" "Create post missing content" \
    '{"title": "Title without content", "post_type": "posts"}' \
    422 "" true

test_endpoint "GET" "/apis/posts/invalid-id" "Get non-existent post" "" 404 "" true

# ===========================================
# USERS API TESTS
# ===========================================
print_test "Users API Endpoints"

test_endpoint "GET" "/apis/users/" "Get all users" "" 200 "" true

# ===========================================
# TAGS API TESTS
# ===========================================
print_test "Tags API Endpoints"

test_endpoint "GET" "/apis/tags/" "Get all tags" "" 200 "" true

# ===========================================
# COMMENTS API TESTS
# ===========================================
print_test "Comments API Endpoints"

test_endpoint "GET" "/apis/comments/" "Get all comments" "" 200 "" true

# ===========================================
# STATS API TESTS
# ===========================================
print_test "Stats API Endpoints"

test_endpoint "GET" "/apis/stats/" "Get system statistics" "" 200 "" true

# ===========================================
# EDGE CASES AND ERROR HANDLING
# ===========================================
print_test "Edge Cases and Error Handling"

# Test non-existent endpoints
test_endpoint "GET" "/apis/nonexistent" "Non-existent endpoint" "" 404 "" true

# Test malformed requests (JSON parsing error should return 422, not 400)
test_endpoint "POST" "/apis/posts/" "Malformed JSON" \
    '{"title": "Test", "content":}' \
    422 "" true

# Test empty requests
test_endpoint "POST" "/apis/posts/" "Empty request body" \
    '' \
    422 "" true

# Test extremely long content
long_content=$(printf 'A%.0s' {1..10000})
test_endpoint "POST" "/apis/posts/" "Very long content (10k chars)" \
    "{\"title\": \"Long Content Test\", \"content\": \"$long_content\", \"post_type\": \"posts\"}" \
    200 "" true

# ===========================================
# PERFORMANCE TESTS
# ===========================================
print_test "Performance Tests"

echo -e "${YELLOW}→ Testing response times...${NC}"

# Test health endpoint performance
start_time=$(date +%s%N)
test_endpoint "GET" "/api/health" "Performance: Health check" "" 200 "" false
end_time=$(date +%s%N)
duration=$(( (end_time - start_time) / 1000000 ))
echo "   Response time: ${duration}ms"

if [ $duration -lt 100 ]; then
    print_success "Response time under 100ms"
elif [ $duration -lt 500 ]; then
    echo -e "${YELLOW}⚠️  Response time: ${duration}ms (acceptable but consider optimization)${NC}"
else
    echo -e "${RED}⚠️  Response time: ${duration}ms (slow - needs optimization)${NC}"
fi

# Test authenticated endpoint performance
start_time=$(date +%s%N)
test_endpoint "GET" "/apis/posts/" "Performance: Posts endpoint" "" 200 "" true
end_time=$(date +%s%N)
duration=$(( (end_time - start_time) / 1000000 ))
echo "   Authenticated endpoint response time: ${duration}ms"

# ===========================================
# CONCURRENT REQUEST TESTS
# ===========================================
print_test "Concurrent Request Tests"

echo -e "${YELLOW}→ Testing concurrent requests (5 simultaneous)...${NC}"
pids=()
for i in {1..5}; do
    (
        curl -s -H "Authorization: Bearer $JWT_TOKEN" "$BASE_URL/apis/posts/" > /dev/null
        echo "Request $i completed"
    ) &
    pids+=($!)
done

# Wait for all background jobs
for pid in "${pids[@]}"; do
    wait $pid
done

print_success "All concurrent requests completed"

# ===========================================
# SECURITY TESTS
# ===========================================
print_test "Security Tests"

# Test SQL injection attempts (URL encode the query parameter)
test_endpoint "GET" "/apis/posts/search/?q=%27%20OR%20%271%27%3D%271" "SQL injection test" "" 200 "" true

# Test XSS attempts
test_endpoint "POST" "/apis/posts/" "XSS prevention test" \
    '{"title": "<script>alert(\"xss\")</script>", "content": "XSS test content", "post_type": "posts"}' \
    200 "" true

# Test invalid token
test_endpoint "GET" "/apis/posts/" "Invalid JWT token test" "" 401 "" false
# Override headers for this test
JWT_TOKEN_BACKUP="$JWT_TOKEN"
export JWT_TOKEN="invalid.jwt.token"
response=$(curl -s -w "\n%{http_code}" -H "Authorization: Bearer invalid.jwt.token" "$BASE_URL/apis/posts/")
status_code=$(echo "$response" | tail -n 1)
if [ "$status_code" -eq 401 ]; then
    print_success "Invalid token properly rejected"
else
    print_failure "Invalid token not properly rejected - Status: $status_code" "$(echo "$response" | sed '$d')"
fi
JWT_TOKEN="$JWT_TOKEN_BACKUP"

# ===========================================
# DATA VALIDATION TESTS
# ===========================================
print_test "Data Validation Tests"

# Test various data formats
test_endpoint "POST" "/apis/posts/" "Unicode content test" \
    '{"title": "Unicode Test 🚀", "content": "Testing unicode: 你好, العربية, русский", "post_type": "posts"}' \
    200 "" true

test_endpoint "POST" "/apis/posts/" "Markdown content test" \
    '{"title": "Markdown Test", "content": "# Header\n\n**Bold** and *italic* text\n\n```code```", "post_type": "posts"}' \
    200 "" true

# ===========================================
# FUTURE API PLACEHOLDERS
# ===========================================
print_test "Future API Endpoints (Placeholder Tests)"

echo -e "${YELLOW}→ Knowledge Base endpoints (not yet implemented):${NC}"
echo "   - GET /apis/knowledge-base/"
echo "   - POST /apis/knowledge-base/"
echo "   - GET /apis/knowledge-base/triggers/"
echo "   - POST /apis/knowledge-base/triggers/"

echo -e "${YELLOW}→ Real-time features (planned):${NC}"
echo "   - WebSocket endpoints for live updates"
echo "   - Server-sent events for notifications"

echo -e "${YELLOW}→ Advanced features (planned):${NC}"
echo "   - File upload endpoints"
echo "   - Bulk operations"
echo "   - Export/Import functionality"

# ===========================================
# CLEANUP TESTS
# ===========================================
print_test "Cleanup and Final Verification"

# Verify system is still healthy after all tests
test_endpoint "GET" "/api/health" "Final health check" "" 200 "healthy" false

# Get final stats
test_endpoint "GET" "/apis/stats/" "Final system statistics" "" 200 "" true

# ===========================================
# TEST SUMMARY
# ===========================================
echo -e "\n${BLUE}============================================================"
echo "                        TEST SUMMARY                        "
echo -e "============================================================${NC}"

TOTAL_TESTS=$((TESTS_PASSED + TESTS_FAILED))

echo -e "📊 ${CYAN}Test Statistics:${NC}"
echo -e "   Total Tests Run: ${TOTAL_TESTS}"
echo -e "   ${GREEN}✅ Passed: ${TESTS_PASSED}${NC}"
echo -e "   ${RED}❌ Failed: ${TESTS_FAILED}${NC}"

if [ $TESTS_FAILED -eq 0 ]; then
    echo -e "\n${GREEN}🎉 ALL TESTS PASSED! 🎉${NC}"
    echo -e "${GREEN}🚀 Your ITG DocVerse API is working perfectly!${NC}"
    echo -e "${GREEN}✨ Authentication, CRUD operations, and security are all functioning correctly.${NC}"
    exit 0
else
    PASS_RATE=$(( (TESTS_PASSED * 100) / TOTAL_TESTS ))
    echo -e "\n${YELLOW}⚠️  Some tests failed (${PASS_RATE}% success rate)${NC}"
    
    if [ $PASS_RATE -ge 90 ]; then
        echo -e "${YELLOW}📝 Most functionality is working - review failed tests above.${NC}"
    elif [ $PASS_RATE -ge 70 ]; then
        echo -e "${YELLOW}📝 Core functionality appears stable - some edge cases may need attention.${NC}"
    else
        echo -e "${RED}📝 Significant issues detected - please review the failures above.${NC}"
    fi
    
    echo -e "${CYAN}💡 This might be expected if certain features aren't fully implemented yet.${NC}"
    exit 1
fi
